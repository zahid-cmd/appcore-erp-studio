//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.FixedAssetsManagement;
using AppCore.Domain.Entities.FixedAssetsManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.FixedAssetsManagement;


//===============================================================
// Depreciation (hand-written pages, 2026-11-14; NEVER run Code
// Sync for them)
//
// A RUN is the depreciation of one month for one branch
// (FDR-0001). The months go in order, with no gap and never
// twice : the next month of a branch is the month after its last
// run (or, with no run yet, the first month an asset of the
// branch has to be charged). A month with nothing to charge is
// stepped over.
//
// An asset is charged from the month it was put to use (a full
// month), every month, until its residual value is reached; an
// asset that is disposed is not charged in the month of the
// disposal or after. An opening asset goes on from the month
// after its depreciation to date.
//
// Posting writes ONE Journal Voucher for the branch, dated the
// last day of the month, a pair of lines for each category :
//     Dr  Depreciation Expense
//     Cr  Accumulated Depreciation
//
// Only the last run of a branch can be undone : its voucher is
// cancelled and the assets get their figures back.
//
// Charge Depreciation on Month End (Asset Configuration switch,
// 2026-11-15) : the background job FaMonthEndDepreciationJob calls
// RunMonthEndAsync at 00:05 on the 1st (Bangladesh time) and when
// the API starts. Every branch is charged for each month that has
// ended and is not charged yet, in order (missed months are caught
// up). The runs are posted by the system user and marked IsAuto.
// A branch that fails (no ledger, closed period ...) is skipped
// and named in the last-check message; it is tried again at the
// next check, or charged by hand.
//===============================================================

public class FaDepreciationRepository
    : IFaDepreciationRepository
{
    private readonly AppDbContext _context;

    private readonly IJournalVoucherRepository _journalVouchers;

    private readonly IFaSetupRepository _setup;

    public FaDepreciationRepository(
        AppDbContext context,
        IJournalVoucherRepository journalVouchers,
        IFaSetupRepository setup)
    {
        _context = context;
        _journalVouchers = journalVouchers;
        _setup = setup;
    }

    private DbSet<FaAssets> Assets => _context.Set<FaAssets>();

    private DbSet<FaDepreciationRuns> Runs => _context.Set<FaDepreciationRuns>();

    private DbSet<FaDepreciationLines> Lines => _context.Set<FaDepreciationLines>();


    //===========================================================
    // Which month is next
    //===========================================================

    // The first month the asset has still to be charged for
    // (0 : nothing left to depreciate)
    private static int FirstDue(FaAssets a)
    {
        if (Fa.Charge(a) <= 0)
        {
            return 0;
        }

        int use = Fa.Period(a.UseDate);

        return a.LastRunPeriod >= use ? Fa.NextPeriod(a.LastRunPeriod) : use;
    }

    // The month the next run of a branch is for (0 : nothing to run)
    private static int NextPeriod(int lastRunPeriod, List<FaAssets> branchAssets)
    {
        List<int> due = branchAssets.Select(FirstDue).Where(x => x > 0).ToList();

        if (due.Count == 0)
        {
            return 0;
        }

        int first = due.Min();

        return lastRunPeriod > 0 ? Math.Max(first, Fa.NextPeriod(lastRunPeriod)) : first;
    }

    private async Task<List<FaAssets>> LiveAssetsAsync(long branchId) =>
        await Assets.AsNoTracking()
            .Where(x => !x.IsDeleted && x.BranchId == branchId && Fa.Live.Contains(x.Status))
            .OrderBy(x => x.AssetNo)
            .ToListAsync();

    private async Task<int> LastPeriodAsync(long branchId) =>
        await Runs.AsNoTracking().Where(x => !x.IsDeleted && x.BranchId == branchId).MaxAsync(x => (int?)x.Period) ?? 0;

    public async Task<List<FaRunBranchDto>> GetBranchesAsync()
    {
        var branches =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.BranchName)
                .Select(x => new { x.BranchId, x.BranchName })
                .ToListAsync();

        List<FaAssets> assets =
            await Assets.AsNoTracking().Where(x => !x.IsDeleted && Fa.Live.Contains(x.Status)).ToListAsync();

        var last =
            await Runs.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .GroupBy(x => x.BranchId)
                .Select(g => new { BranchId = g.Key, Period = g.Max(x => x.Period) })
                .ToListAsync();

        return branches
            .Select(b =>
            {
                List<FaAssets> mine = assets.Where(x => x.BranchId == b.BranchId).ToList();

                int lastPeriod = last.FirstOrDefault(x => x.BranchId == b.BranchId)?.Period ?? 0;

                int next = NextPeriod(lastPeriod, mine);

                return new FaRunBranchDto
                {
                    BranchId = b.BranchId,
                    BranchName = b.BranchName,
                    AssetCount = mine.Count,
                    LastPeriod = lastPeriod,
                    LastPeriodText = Fa.PeriodText(lastPeriod),
                    NextPeriod = next,
                    NextPeriodText = Fa.PeriodText(next)
                };
            })
            .Where(x => x.AssetCount > 0 || x.LastPeriod > 0)
            .ToList();
    }


    //===========================================================
    // Read
    //===========================================================

    private static FaRunLineDto ToLine(string assetNo, string name, string category, long assetId, decimal cost, decimal residual, decimal opening, decimal charge)
    {
        decimal closing = opening + charge;

        return new FaRunLineDto
        {
            FaAssetId = assetId,
            AssetNo = assetNo,
            Name = name,
            CategoryName = category,
            Cost = cost,
            OpeningAccumulated = opening,
            Charge = charge,
            ClosingAccumulated = closing,
            BookValue = cost - closing,
            Note = closing >= cost - residual ? "Fully depreciated" : string.Empty
        };
    }

    public async Task<List<FaRunDto>> GetRunsAsync()
    {
        List<FaDepreciationRuns> rows =
            await Runs.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.Period).ThenBy(x => x.BranchId)
                .ToListAsync();

        FaNames names = await Fa.NamesAsync(_context);

        return rows
            .Select(r => new FaRunDto
            {
                PublicId = r.PublicId,
                Code = r.Code,
                BranchId = r.BranchId,
                BranchName = names.Branch(r.BranchId),
                Period = r.Period,
                PeriodText = Fa.PeriodText(r.Period),
                RunDate = HrCalendar.Day(r.RunDate),
                AssetCount = r.AssetCount,
                TotalAmount = r.TotalAmount,
                JournalVoucherNo = r.JournalVoucherNo,
                Remarks = r.Remarks,
                IsAuto = r.IsAuto,
                IsLast = r.Period == rows.Where(x => x.BranchId == r.BranchId).Max(x => x.Period)
            })
            .ToList();
    }

    public async Task<FaRunDto> GetRunAsync(Guid publicId)
    {
        FaRunDto run =
            (await GetRunsAsync()).FirstOrDefault(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The depreciation run was not found.");

        long runId = await Runs.AsNoTracking().Where(x => x.PublicId == publicId).Select(x => x.FaDepreciationRunId).FirstAsync();

        FaNames names = await Fa.NamesAsync(_context);

        var lines =
            await (
                from l in Lines.AsNoTracking()
                where l.FaDepreciationRunId == runId
                join a in Assets.AsNoTracking() on l.FaAssetId equals a.FaAssetId
                orderby a.AssetNo
                select new { l.FaAssetId, a.AssetNo, a.Name, l.FaCategoryId, l.Cost, a.ResidualValue, l.OpeningAccumulated, l.Charge })
            .ToListAsync();

        run.Lines =
            lines
                .Select(l => ToLine(l.AssetNo, l.Name, names.Category(l.FaCategoryId), l.FaAssetId, l.Cost, l.ResidualValue, l.OpeningAccumulated, l.Charge))
                .ToList();

        return run;
    }


    //===========================================================
    // Preview / post
    //===========================================================

    // The assets a run of the month charges, with the charge
    private async Task<(List<(FaAssets Asset, decimal Charge)> Rows, string BranchName)> WorkOutAsync(long branchId, int period)
    {
        string branchName =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => x.BranchId == branchId && !x.IsDeleted)
                .Select(x => x.BranchName)
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the branch.");

        if (!Fa.IsPeriod(period))
        {
            throw new InvalidOperationException("Pick the month.");
        }

        List<FaAssets> assets = await LiveAssetsAsync(branchId);

        int last = await LastPeriodAsync(branchId);

        int next = NextPeriod(last, assets);

        if (next == 0)
        {
            throw new InvalidOperationException($"{branchName} has nothing to depreciate : no asset in use, or every asset is at its residual value.");
        }

        if (period != next)
        {
            throw new InvalidOperationException($"The next depreciation run of {branchName} is for {Fa.PeriodText(next)} : the months go in order.");
        }

        FaConfigurationDto config = await _setup.GetConfigurationAsync();

        int thisMonth = Fa.Period(HrCalendar.Today());

        if (period > thisMonth || (period == thisMonth && !config.AllowRunningMonth))
        {
            throw new InvalidOperationException(
                period > thisMonth
                    ? $"{Fa.PeriodText(period)} has not started yet."
                    : $"{Fa.PeriodText(period)} has not ended yet. (Asset Configuration can allow a run before the month ends.)");
        }

        List<(FaAssets, decimal)> rows = new();

        foreach (FaAssets a in assets)
        {
            if (Fa.Period(a.UseDate) > period || a.LastRunPeriod >= period)
            {
                continue;
            }

            decimal charge = Fa.Charge(a);

            if (charge > 0)
            {
                rows.Add((a, charge));
            }
        }

        return (rows, branchName);
    }

    public async Task<FaRunDto> PreviewAsync(long branchId, int period)
    {
        var (rows, branchName) = await WorkOutAsync(branchId, period);

        FaNames names = await Fa.NamesAsync(_context);

        return new FaRunDto
        {
            BranchId = branchId,
            BranchName = branchName,
            Period = period,
            PeriodText = Fa.PeriodText(period),
            RunDate = HrCalendar.Day(Fa.PeriodEnd(period)),
            AssetCount = rows.Count,
            TotalAmount = rows.Sum(x => x.Charge),
            Lines =
                rows
                    .Select(x => ToLine(x.Asset.AssetNo, x.Asset.Name, names.Category(x.Asset.FaCategoryId), x.Asset.FaAssetId, x.Asset.Cost + x.Asset.ImprovementCost, x.Asset.ResidualValue, x.Asset.AccumulatedDepreciation, x.Charge))
                    .ToList()
        };
    }

    public Task<FaRunDto> PostAsync(PostFaRunDto dto, long userId) =>
        PostRunAsync(dto, userId, false);

    private async Task<FaRunDto> PostRunAsync(PostFaRunDto dto, long userId, bool auto)
    {
        var (rows, branchName) = await WorkOutAsync(dto.BranchId, dto.Period);

        if (rows.Count == 0)
        {
            throw new InvalidOperationException($"{branchName} has nothing to depreciate for {Fa.PeriodText(dto.Period)}.");
        }

        string remarks = Fa.Clean(dto.Remarks, 500, "Remarks");

        Dictionary<long, FaCategories> categories =
            (await _context.Set<FaCategories>().AsNoTracking().ToListAsync()).ToDictionary(x => x.FaCategoryId);

        // a pair of lines for each category (its own group)
        List<JournalVoucherLineDto> voucherLines = new();

        int group = 0;

        string month = Fa.PeriodText(dto.Period);

        // an asset group with no expense ledger of its own uses the
        // Posting Setup one (Fixed Assets - Depreciation Expense)
        string? postingExpense = null;

        foreach (var byCategory in rows.GroupBy(x => x.Asset.FaCategoryId).OrderBy(g => categories[g.Key].Code))
        {
            FaCategories category = categories[byCategory.Key];

            Fa.NeedLedgers(category);

            decimal amount = byCategory.Sum(x => x.Charge);

            group++;

            string expense =
                category.ExpenseLedgerCode.Length > 0
                    ? category.ExpenseLedgerCode
                    : postingExpense ??= PostingLedgerCodes.Get(_context, Fa.DepreciationExpensePurpose);

            voucherLines.Add(Fa.Debit(group, expense, amount, $"Depreciation {month} : {category.Name}"));
            voucherLines.Add(Fa.Credit(group, category.AccumLedgerCode, amount, $"Depreciation {month} : {category.Name}"));
        }

        decimal total = rows.Sum(x => x.Charge);

        DateOnly today = HrCalendar.Today();

        DateOnly runDate = Fa.PeriodEnd(dto.Period) > today ? today : Fa.PeriodEnd(dto.Period);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FaDepreciationRuns run = new()
        {
            Code = Fa.NextCode(await Runs.AsNoTracking().Select(x => x.Code).ToListAsync(), "FDR-"),
            BranchId = dto.BranchId,
            Period = dto.Period,
            RunDate = runDate,
            AssetCount = rows.Count,
            TotalAmount = total,
            Remarks = remarks,
            IsAuto = auto,
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        Runs.Add(run);

        await _context.SaveChangesAsync();

        JournalVoucherSavedDto voucher =
            await _journalVouchers.CreatePostedAsync(
                new CreateJournalVoucherDto
                {
                    VoucherDate = HrCalendar.Day(runDate),
                    BranchId = dto.BranchId,
                    Narration = $"Depreciation of {month} : {rows.Count} asset(s), Tk {Fa.Money(total)} | {run.Code}{(auto ? " (month end)" : string.Empty)}",
                    Lines = voucherLines
                },
                run.Code,
                userId);

        run.JournalVoucherId = voucher.JournalVoucherId;
        run.JournalVoucherNo = Fa.Short(voucher.VoucherNo);

        List<long> ids = rows.Select(x => x.Asset.FaAssetId).ToList();

        Dictionary<long, FaAssets> tracked = (await Assets.Where(x => ids.Contains(x.FaAssetId)).ToListAsync()).ToDictionary(x => x.FaAssetId);

        foreach (var (asset, charge) in rows)
        {
            FaAssets card = tracked[asset.FaAssetId];

            Lines.Add(
                new FaDepreciationLines
                {
                    FaDepreciationRunId = run.FaDepreciationRunId,
                    FaAssetId = card.FaAssetId,
                    FaCategoryId = card.FaCategoryId,
                    Period = dto.Period,
                    Cost = card.Cost + card.ImprovementCost,
                    OpeningAccumulated = card.AccumulatedDepreciation,
                    Charge = charge,
                    PrevRunPeriod = card.LastRunPeriod
                });

            card.AccumulatedDepreciation += charge;
            card.LastRunPeriod = dto.Period;
        }

        Fa.AddHistory(_context, "FaDepreciationRuns", run.FaDepreciationRunId, "Post", auto ? "Depreciation Charged on Month End" : "Depreciation Charged", $"{run.Code} : {branchName}, {month}, {rows.Count} asset(s), Tk {Fa.Money(total)}. Journal Voucher {run.JournalVoucherNo}.{(auto ? " Charged automatically on month end." : string.Empty)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetRunAsync(run.PublicId);
    }

    public async Task UndoAsync(Guid publicId, FaReasonDto dto, long userId)
    {
        FaDepreciationRuns run =
            await Runs.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The depreciation run was not found.");

        string reason = Fa.Clean(dto?.Reason, 300, "Reason");

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Write why the run is undone.");
        }

        if (run.Period != await LastPeriodAsync(run.BranchId))
        {
            throw new InvalidOperationException($"{run.Code} is not the last run of its branch : undo the later runs first.");
        }

        List<FaDepreciationLines> lines = await Lines.AsNoTracking().Where(x => x.FaDepreciationRunId == run.FaDepreciationRunId).ToListAsync();

        List<long> ids = lines.Select(x => x.FaAssetId).ToList();

        Dictionary<long, FaAssets> cards = (await Assets.Where(x => ids.Contains(x.FaAssetId)).ToListAsync()).ToDictionary(x => x.FaAssetId);

        List<string> blocked =
            cards.Values
                .Where(x => x.IsDeleted || !Fa.Live.Contains(x.Status) || x.BranchId != run.BranchId)
                .Select(x => x.AssetNo)
                .Take(5)
                .ToList();

        if (blocked.Count > 0)
        {
            throw new InvalidOperationException($"{run.Code} cannot be undone : {string.Join(", ", blocked)} was disposed or moved to another branch after it.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (run.JournalVoucherId != null)
        {
            await _journalVouchers.CancelAsync(
                run.JournalVoucherId.Value,
                new CancelJournalVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{run.Code} undone : {reason}" },
                userId);
        }

        foreach (FaDepreciationLines line in lines)
        {
            FaAssets card = cards[line.FaAssetId];

            card.AccumulatedDepreciation = Math.Max(card.OpeningAccumulated, card.AccumulatedDepreciation - line.Charge);
            card.LastRunPeriod = line.PrevRunPeriod;
        }

        run.IsDeleted = true;
        run.DeletedBy = userId;
        run.DeletedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaDepreciationRuns", run.FaDepreciationRunId, "Cancel", "Depreciation Charge Undone", $"{run.Code} : {Fa.PeriodText(run.Period)}, Tk {Fa.Money(run.TotalAmount)}. Journal Voucher {run.JournalVoucherNo} cancelled. Reason : {reason}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Charge Depreciation on Month End
    //===========================================================

    // The user the month-end runs are posted by (the system user,
    // as the MFS / POS auto settlements)
    private const long SystemUserId = 1;

    public const string MonthEndRunsAt = "00:05 on the 1st of every month";

    private const string MonthEndRemarks = "Charged automatically on month end.";

    // UTC -> Bangladesh time (UTC+6, no daylight saving)
    private static string BusinessText(DateTime? utc) =>
        utc == null
            ? string.Empty
            : DateTime.SpecifyKind(utc.Value, DateTimeKind.Utc).AddHours(6).ToString("dd-MMM-yyyy hh:mm tt", System.Globalization.CultureInfo.InvariantCulture);

    public async Task<FaAutoChargeDto> GetAutoChargeAsync()
    {
        FaConfiguration row =
            await _context.Set<FaConfiguration>().AsNoTracking().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync()
            ?? new FaConfiguration();

        return new FaAutoChargeDto
        {
            On = row.AutoChargeMonthEnd,
            RunsAt = MonthEndRunsAt,
            LastCheck = BusinessText(row.AutoLastCheck),
            LastMessage = row.AutoLastMessage
        };
    }

    public async Task<string> RunMonthEndAsync(CancellationToken cancellationToken)
    {
        FaConfiguration? config =
            await _context.Set<FaConfiguration>().AsNoTracking().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync(cancellationToken);

        if (config == null || !config.AutoChargeMonthEnd)
        {
            return "Charge Depreciation on Month End is OFF : nothing done.";
        }

        // only the months that have ended
        int thisMonth = Fa.Period(HrCalendar.Today());

        List<string> charged = new();

        List<string> failed = new();

        foreach (FaRunBranchDto branch in await GetBranchesAsync())
        {
            // every month still due, oldest first (10 years at most)
            for (int i = 0; i < 120; i++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                int next = NextPeriod(await LastPeriodAsync(branch.BranchId), await LiveAssetsAsync(branch.BranchId));

                if (next == 0 || next >= thisMonth)
                {
                    break;
                }

                try
                {
                    FaRunDto run =
                        await PostRunAsync(
                            new PostFaRunDto { BranchId = branch.BranchId, Period = next, Remarks = MonthEndRemarks },
                            SystemUserId,
                            true);

                    charged.Add($"{branch.BranchName} {run.PeriodText} ({run.Code}, Tk {Fa.Money(run.TotalAmount)})");
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    // the branch waits for the next check (or a run by hand)
                    _context.ChangeTracker.Clear();

                    failed.Add($"{branch.BranchName} {Fa.PeriodText(next)} : {(ex is InvalidOperationException ? ex.Message : ex.GetBaseException().Message)}");

                    break;
                }
            }
        }

        string message =
            charged.Count == 0 && failed.Count == 0
                ? "Nothing to charge : every branch is charged up to the last month."
                : string.Join(" ",
                    new[]
                    {
                        charged.Count > 0 ? $"Charged : {string.Join("; ", charged)}." : string.Empty,
                        failed.Count > 0 ? $"NOT charged : {string.Join("; ", failed)}. Fix it, then charge by hand or wait for the next check." : string.Empty
                    }
                    .Where(x => x.Length > 0));

        FaConfiguration? row =
            await _context.Set<FaConfiguration>().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync(cancellationToken);

        if (row != null)
        {
            row.AutoLastCheck = DateTime.UtcNow;
            row.AutoLastMessage = message.Length > 1000 ? message[..997] + "..." : message;

            await _context.SaveChangesAsync(cancellationToken);
        }

        return message;
    }


    //===========================================================
    // Depreciation Schedule of one asset : the months posted, then
    // the months still to come
    //===========================================================

    public async Task<FaScheduleDto> GetScheduleAsync(Guid assetPublicId)
    {
        FaAssets a =
            await Assets.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == assetPublicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset card was not found.");

        FaNames names = await Fa.NamesAsync(_context);

        decimal cost = a.Cost + a.ImprovementCost;

        var posted =
            await (
                from l in Lines.AsNoTracking()
                where l.FaAssetId == a.FaAssetId
                join r in Runs.AsNoTracking() on l.FaDepreciationRunId equals r.FaDepreciationRunId
                where !r.IsDeleted
                orderby l.Period
                select new { l.Period, l.Cost, l.OpeningAccumulated, l.Charge })
            .ToListAsync();

        FaScheduleDto schedule = new() { Asset = Fa.ToDto(a, names) };

        foreach (var line in posted)
        {
            schedule.Rows.Add(
                new FaScheduleRowDto
                {
                    Period = line.Period,
                    PeriodText = Fa.PeriodText(line.Period),
                    Opening = line.OpeningAccumulated,
                    Charge = line.Charge,
                    Closing = line.OpeningAccumulated + line.Charge,
                    BookValue = line.Cost - line.OpeningAccumulated - line.Charge,
                    Posted = true
                });
        }

        // what is still to come (an asset still owned)
        if (Fa.Live.Contains(a.Status))
        {
            int period = FirstDue(a);

            decimal accumulated = a.AccumulatedDepreciation;

            int months = 0;

            while (period > 0 && months < 1200)
            {
                decimal charge = Fa.Charge(a.Method, a.RatePercent, a.LifeYears, cost, a.ResidualValue, accumulated);

                if (charge <= 0)
                {
                    break;
                }

                schedule.Rows.Add(
                    new FaScheduleRowDto
                    {
                        Period = period,
                        PeriodText = Fa.PeriodText(period),
                        Opening = accumulated,
                        Charge = charge,
                        Closing = accumulated + charge,
                        BookValue = cost - accumulated - charge,
                        Posted = false
                    });

                accumulated += charge;
                period = Fa.NextPeriod(period);
                months++;
            }

            schedule.MonthsLeft = months;
            schedule.EndsText = months > 0 ? schedule.Rows[^1].PeriodText : string.Empty;
        }

        return schedule;
    }
}
