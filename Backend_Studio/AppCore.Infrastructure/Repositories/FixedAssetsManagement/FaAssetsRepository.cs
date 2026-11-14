//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.FixedAssetsManagement;
using AppCore.Application.Platform.Accounting;
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
// Asset Register (hand-written pages, 2026-11-14; NEVER run Code
// Sync for them)
//
// THE ASSET CARDS (Fixed Asset Register, Opening Assets)
//   Asset No : <prefix>-<branch>-<category>-<running number>, e.g.
//   FA-01-003-00012. One card an item; a group card holds a
//   quantity.
//
//   An OPENING asset is owned from before the module : its cost
//   and depreciation are in the ledgers already, so the card is
//   made with its depreciation to date and NO voucher. The month
//   that depreciation covers (DepreciatedUpTo) is its last run :
//   the depreciation runs go on from the month after.
//
// ASSET ACQUISITIONS (FAQ-0001)
//   Draft    the items can be changed, the document deleted
//   Posted   one Journal Voucher :
//                Dr  the Asset Cost ledger of each category
//                Cr  the supplier, or the payable ledger named
//            and an asset card for every item (a "Group" line :
//            one card with the quantity). The money is paid on a
//            Payment Voucher against the ledger credited.
//            Unposting cancels the voucher and removes the cards
//            (refused once a card was depreciated or moved).
//===============================================================

public class FaAssetsRepository
    : IFaAssetsRepository
{
    private const string Draft = "Draft";

    private const string Posted = "Posted";

    private readonly AppDbContext _context;

    private readonly IJournalVoucherRepository _journalVouchers;

    private readonly IVoucherLedgerRepository _ledgers;

    private readonly IFaSetupRepository _setup;

    public FaAssetsRepository(
        AppDbContext context,
        IJournalVoucherRepository journalVouchers,
        IVoucherLedgerRepository ledgers,
        IFaSetupRepository setup)
    {
        _context = context;
        _journalVouchers = journalVouchers;
        _ledgers = ledgers;
        _setup = setup;
    }

    private DbSet<FaAssets> Assets => _context.Set<FaAssets>();

    private DbSet<FaAcquisitions> Acquisitions => _context.Set<FaAcquisitions>();

    private DbSet<FaAcquisitionLines> AcquisitionLines => _context.Set<FaAcquisitionLines>();


    //===========================================================
    // Helpers
    //===========================================================

    // The cards a depreciation run charged (runs not undone)
    private async Task<HashSet<long>> DepreciatedAsync(List<long>? ids = null) =>
        (await (
            from l in _context.Set<FaDepreciationLines>().AsNoTracking()
            join r in _context.Set<FaDepreciationRuns>().AsNoTracking() on l.FaDepreciationRunId equals r.FaDepreciationRunId
            where !r.IsDeleted && (ids == null || ids.Contains(l.FaAssetId))
            select l.FaAssetId)
        .Distinct()
        .ToListAsync())
        .ToHashSet();

    // The cards that were disposed
    private async Task<HashSet<long>> MovedAsync(List<long>? ids = null) =>
        (await _context.Set<FaDisposals>().AsNoTracking()
            .Where(x => !x.IsDeleted && (ids == null || ids.Contains(x.FaAssetId)))
            .Select(x => x.FaAssetId).Distinct().ToListAsync())
        .ToHashSet();

    // FA-01-003-00012 : the next number of the category
    internal static async Task<Func<long, FaCategories, string>> AssetNumbersAsync(AppDbContext context)
    {
        FaConfiguration config =
            await context.Set<FaConfiguration>().AsNoTracking().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync()
            ?? new FaConfiguration();

        // the highest running number of each category so far
        // (deleted cards keep their number)
        Dictionary<long, int> highest =
            (await context.Set<FaAssets>().AsNoTracking().Select(x => new { x.FaCategoryId, x.AssetNo }).ToListAsync())
            .GroupBy(x => x.FaCategoryId)
            .ToDictionary(
                g => g.Key,
                g => g.Max(x => int.TryParse(x.AssetNo.Substring(x.AssetNo.LastIndexOf('-') + 1), out int number) ? number : 0));

        return (branchId, category) =>
        {
            int next = (highest.TryGetValue(category.FaCategoryId, out int last) ? last : 0) + 1;

            highest[category.FaCategoryId] = next;

            string categoryNo =
                int.TryParse(category.Code.Substring(category.Code.IndexOf('-') + 1), out int number) ? number.ToString("D3") : "000";

            return $"{config.AssetNoPrefix}-{branchId:D2}-{categoryNo}-{next.ToString("D" + config.AssetNoDigits)}";
        };
    }


    // The asset no the next card of this branch and asset group gets
    // (the add form shows it; the save makes it again, so two users
    // adding at once never share a number)
    public async Task<string> NextAssetNoAsync(long branchId, long categoryId)
    {
        if (branchId <= 0 || categoryId <= 0)
        {
            return string.Empty;
        }

        FaCategories? category =
            await _context.Set<FaCategories>().AsNoTracking().FirstOrDefaultAsync(x => x.FaCategoryId == categoryId && !x.IsDeleted);

        return category == null
            ? string.Empty
            : (await AssetNumbersAsync(_context))(branchId, category);
    }


    //===========================================================
    // The asset cards
    //===========================================================

    public async Task<List<FaAssetDto>> GetAssetsAsync(string? source)
    {
        string want = (source ?? string.Empty).Trim();

        List<FaAssets> rows =
            await Assets.AsNoTracking()
                .Where(x => !x.IsDeleted && (want == string.Empty || x.Source == want))
                .OrderBy(x => x.AssetNo)
                .ToListAsync();

        FaNames names = await Fa.NamesAsync(_context);

        FaConfigurationDto config = await _setup.GetConfigurationAsync();

        HashSet<long> depreciated = await DepreciatedAsync();

        HashSet<long> moved = await MovedAsync();

        Dictionary<long, string> acquisitionCodes =
            (await Acquisitions.AsNoTracking().Select(x => new { x.FaAcquisitionId, x.Code }).ToListAsync())
            .ToDictionary(x => x.FaAcquisitionId, x => x.Code);

        return rows
            .Select(a =>
            {
                FaAssetDto dto = Fa.ToDto(a, names);

                bool live = Fa.Live.Contains(a.Status);

                dto.AcquisitionCode = a.FaAcquisitionId != null && acquisitionCodes.TryGetValue(a.FaAcquisitionId.Value, out string? code) ? code : string.Empty;
                dto.CanEditMoney = live && a.Source == "Opening" && !depreciated.Contains(a.FaAssetId) && !moved.Contains(a.FaAssetId);
                dto.CanEditRule = live && config.AllowAssetRule && !depreciated.Contains(a.FaAssetId);

                return dto;
            })
            .ToList();
    }

    public async Task<FaAssetDto> GetAssetAsync(Guid publicId)
    {
        FaAssets a =
            await Assets.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset card was not found.");

        FaNames names = await Fa.NamesAsync(_context);

        FaConfigurationDto config = await _setup.GetConfigurationAsync();

        List<long> one = new() { a.FaAssetId };

        bool depreciated = (await DepreciatedAsync(one)).Count > 0;

        bool moved = (await MovedAsync(one)).Count > 0;

        bool live = Fa.Live.Contains(a.Status);

        FaAssetDto dto = Fa.ToDto(a, names);

        dto.CanEditMoney = live && a.Source == "Opening" && !depreciated && !moved;
        dto.CanEditRule = live && config.AllowAssetRule && !depreciated;

        if (a.FaAcquisitionId != null)
        {
            dto.AcquisitionCode =
                await Acquisitions.AsNoTracking().Where(x => x.FaAcquisitionId == a.FaAcquisitionId).Select(x => x.Code).FirstOrDefaultAsync() ?? string.Empty;
        }

        //-------------------------------------------------------
        // Everything that happened to the card
        //-------------------------------------------------------

        List<(DateOnly Date, FaAssetEventDto Event)> events = new();

        void Add(DateOnly date, string kind, string code, string text, decimal amount) =>
            events.Add((date, new FaAssetEventDto { Date = HrCalendar.Day(date), Kind = kind, Code = code, Text = text, Amount = amount }));

        if (a.Source == "Opening")
        {
            Add(a.PurchaseDate, "Opening", a.JournalVoucherNo, $"Opening asset : cost Tk {Fa.Money(a.Cost)}, depreciation to date Tk {Fa.Money(a.OpeningAccumulated)}", a.Cost);
        }
        else
        {
            Add(a.PurchaseDate, "Acquired", dto.AcquisitionCode, $"Bought{(a.SupplierName.Length > 0 ? " from " + a.SupplierName : string.Empty)} : cost Tk {Fa.Money(a.Cost)}", a.Cost);
        }

        var runs =
            await (
                from l in _context.Set<FaDepreciationLines>().AsNoTracking()
                where l.FaAssetId == a.FaAssetId
                join r in _context.Set<FaDepreciationRuns>().AsNoTracking() on l.FaDepreciationRunId equals r.FaDepreciationRunId
                where !r.IsDeleted
                select new { r.RunDate, r.Code, l.Period, l.Charge })
            .ToListAsync();

        foreach (var run in runs)
        {
            Add(run.RunDate, "Depreciation", run.Code, $"Depreciation of {Fa.PeriodText(run.Period)}", run.Charge);
        }

        foreach (FaDisposals d in await _context.Set<FaDisposals>().AsNoTracking().Where(x => x.FaAssetId == a.FaAssetId && !x.IsDeleted).ToListAsync())
        {
            Add(d.DisposalDate, "Disposal", d.Code, $"{d.Kind} : book value Tk {Fa.Money(d.BookValue)}, {(d.GainLoss >= 0 ? "gain" : "loss")} Tk {Fa.Money(Math.Abs(d.GainLoss))}", d.SalePrice);
        }

        dto.History = events.OrderBy(x => x.Date).Select(x => x.Event).ToList();

        return dto;
    }

    // Checks the DTO and writes it on the card : the descriptive
    // part always; the money / the rule when asked
    private async Task ApplyAsync(FaAssets entity, SaveFaAssetDto dto, bool money, bool rule, bool isNew)
    {
        FaConfigurationDto config = await _setup.GetConfigurationAsync();

        string name = Fa.Clean(dto.Name, 150, "Asset Name");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Asset Name is required.");
        }

        long branchId = isNew || money ? dto.BranchId : entity.BranchId;

        if (isNew || money)
        {
            if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted))
            {
                throw new InvalidOperationException("Pick the branch.");
            }
        }

        long? locationId = dto.FaLocationId > 0 ? dto.FaLocationId : null;

        if (locationId != null
            && !await _context.Set<FaLocations>().AsNoTracking().AnyAsync(x => x.FaLocationId == locationId && !x.IsDeleted && x.BranchId == branchId))
        {
            throw new InvalidOperationException("The location is not a location of the asset's branch.");
        }

        if (locationId == null && config.RequireLocation)
        {
            throw new InvalidOperationException("Pick the location (Asset Configuration asks for it).");
        }

        long? custodianId = dto.CustodianEmployeeId > 0 ? dto.CustodianEmployeeId : null;

        if (custodianId == null && config.RequireCustodian)
        {
            throw new InvalidOperationException("Pick the custodian (Asset Configuration asks for it).");
        }

        entity.Name = name;
        entity.Description = Fa.Clean(dto.Description, 500, "Description");
        entity.Brand = Fa.Clean(dto.Brand, 100, "Brand");
        entity.Model = Fa.Clean(dto.Model, 100, "Model");
        entity.SerialNo = Fa.Clean(dto.SerialNo, 100, "Serial No");
        entity.SupplierName = Fa.Clean(dto.SupplierName, 150, "Supplier");
        entity.PurchaseRef = Fa.Clean(dto.PurchaseRef, 60, "Purchase Reference");
        entity.Remarks = Fa.Clean(dto.Remarks, 500, "Remarks");
        entity.FaLocationId = locationId;
        entity.CustodianEmployeeId = custodianId;

        if (Fa.Live.Contains(entity.Status) || isNew)
        {
            entity.Status = Fa.Live.FirstOrDefault(x => string.Equals(x, dto.Status, StringComparison.OrdinalIgnoreCase)) ?? Fa.InUse;
        }

        FaCategories category =
            await _context.Set<FaCategories>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.FaCategoryId == (isNew || money ? dto.FaCategoryId : entity.FaCategoryId) && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the asset group.");

        if (isNew || money)
        {
            Fa.NeedDeclared(category);

            DateOnly today = HrCalendar.Today();

            DateOnly purchase =
                HrCalendar.ParseDay(dto.PurchaseDate)
                ?? throw new InvalidOperationException("Purchase Date is required.");

            DateOnly use = HrCalendar.ParseDay(dto.UseDate) ?? purchase;

            if (purchase > today || use > today)
            {
                throw new InvalidOperationException("The purchase and put-to-use dates cannot be in the future.");
            }

            if (use < purchase)
            {
                throw new InvalidOperationException("The asset cannot be put to use before it was bought.");
            }

            decimal quantity = Math.Round(dto.Quantity, 2);

            if (quantity <= 0)
            {
                throw new InvalidOperationException("Quantity must be more than 0.");
            }

            if (quantity != 1 && !category.AllowGroupCard)
            {
                throw new InvalidOperationException($"{category.Name} does not allow one card for many items : the quantity must be 1.");
            }

            decimal cost = Fa.Round(dto.Cost);

            decimal residual = Fa.Round(dto.ResidualValue);

            decimal opening = Fa.Round(dto.OpeningAccumulated);

            if (cost <= 0)
            {
                throw new InvalidOperationException("Cost must be more than 0.");
            }

            if (residual < 0 || residual >= cost)
            {
                throw new InvalidOperationException("The residual value must be below the cost.");
            }

            if (opening < 0 || opening > cost - residual)
            {
                throw new InvalidOperationException($"Depreciation to date cannot be more than the cost less the residual value (Tk {Fa.Money(cost - residual)}).");
            }

            int upTo = dto.DepreciatedUpTo;

            if (opening > 0)
            {
                if (!Fa.IsPeriod(upTo))
                {
                    throw new InvalidOperationException("Pick the month the depreciation to date goes up to.");
                }

                if (upTo < Fa.Period(use) || upTo > Fa.Period(today))
                {
                    throw new InvalidOperationException("The month the depreciation goes up to must be from the put-to-use month to this month.");
                }
            }
            else if (!Fa.IsPeriod(upTo))
            {
                // no depreciation yet : the runs start with its use month
                upTo = 0;
            }

            entity.FaCategoryId = category.FaCategoryId;
            entity.BranchId = dto.BranchId;
            entity.PurchaseDate = purchase;
            entity.UseDate = use;
            entity.Quantity = quantity;
            entity.Cost = cost;
            entity.ResidualValue = residual;
            entity.OpeningAccumulated = opening;
            entity.AccumulatedDepreciation = opening;
            entity.LastRunPeriod = upTo;
        }

        if (isNew || rule)
        {
            bool own = config.AllowAssetRule;

            string method =
                !own || category.Method == Fa.NoDepreciation ? category.Method
                : string.Equals(dto.Method, Fa.NoDepreciation, StringComparison.OrdinalIgnoreCase) ? Fa.NoDepreciation
                : string.Equals(dto.Method, Fa.ReducingBalance, StringComparison.OrdinalIgnoreCase) ? Fa.ReducingBalance
                : Fa.StraightLine;

            decimal rate = method == Fa.NoDepreciation ? 0 : own ? Math.Round(dto.RatePercent, 3) : category.RatePercent;

            int life = method == Fa.NoDepreciation ? 0 : own ? dto.LifeYears : category.LifeYears;

            if (rate < 0 || rate > 100 || life < 0 || life > 100)
            {
                throw new InvalidOperationException("Rate must be 0 to 100 %, and the useful life 0 to 100 years.");
            }

            if (method == Fa.ReducingBalance && rate <= 0)
            {
                throw new InvalidOperationException("Reducing balance needs a rate (% a year).");
            }

            if (method == Fa.StraightLine && life <= 0 && rate <= 0)
            {
                throw new InvalidOperationException("Straight line needs a useful life (years) or a rate (% a year).");
            }

            entity.Method = method;
            entity.RatePercent = rate;
            entity.LifeYears = method == Fa.StraightLine ? life : 0;
        }
    }

    // The opening ledger of Posting Setup : credited with the book
    // value of every opening asset
    private const string OpeningPurpose = "ASSET-OPENING-BALANCE";

    // What the voucher of an opening asset is made of : it is written
    // again only when one of these changes
    private static string OpeningKey(FaAssets a) =>
        $"{a.FaCategoryId}|{a.BranchId}|{a.Cost}|{a.OpeningAccumulated}|{a.LastRunPeriod}|{a.UseDate:yyyyMMdd}";

    // Puts an opening asset in the ledgers :
    //   Dr  PPE - <asset group>       the cost
    //   Cr  ACD - <asset group>       the depreciation to date
    //   Cr  the opening ledger        the book value
    // dated the last day of the month it is depreciated up to (never
    // after today), or the day it was put to use
    private async Task PostOpeningAsync(FaAssets entity, long userId)
    {
        FaCategories category =
            await _context.Set<FaCategories>().AsNoTracking().FirstAsync(x => x.FaCategoryId == entity.FaCategoryId);

        Fa.NeedLedgers(category);

        string openingLedger = PostingLedgerCodes.Get(_context, OpeningPurpose);

        DateOnly today = HrCalendar.Today();

        DateOnly date = Fa.IsPeriod(entity.LastRunPeriod) ? Fa.PeriodEnd(entity.LastRunPeriod) : entity.UseDate;

        if (date > today)
        {
            date = today;
        }

        decimal bookValue = entity.Cost - entity.OpeningAccumulated;

        string note = $"Opening asset {entity.AssetNo} {entity.Name}";

        List<JournalVoucherLineDto> lines = new() { Fa.Debit(1, category.CostLedgerCode, entity.Cost, note) };

        if (entity.OpeningAccumulated > 0)
        {
            lines.Add(Fa.Credit(1, category.AccumLedgerCode, entity.OpeningAccumulated, $"{note} : depreciation to {Fa.PeriodText(entity.LastRunPeriod)}"));
        }

        if (bookValue > 0)
        {
            lines.Add(Fa.Credit(1, openingLedger, bookValue, $"{note} : book value"));
        }

        JournalVoucherSavedDto voucher =
            await _journalVouchers.CreatePostedAsync(
                new CreateJournalVoucherDto
                {
                    VoucherDate = HrCalendar.Day(date),
                    BranchId = entity.BranchId,
                    Narration = $"Opening fixed asset {entity.AssetNo} {entity.Name} : cost Tk {Fa.Money(entity.Cost)}, depreciation to date Tk {Fa.Money(entity.OpeningAccumulated)}",
                    Lines = lines
                },
                entity.AssetNo,
                userId);

        entity.JournalVoucherId = voucher.JournalVoucherId;
        entity.JournalVoucherNo = Fa.Short(voucher.VoucherNo);
    }

    // Takes an opening asset out of the ledgers (its voucher is
    // cancelled); the number of the cancelled voucher
    private async Task<string> CancelOpeningAsync(FaAssets entity, string why, long userId)
    {
        string voucherNo = entity.JournalVoucherNo;

        if (entity.JournalVoucherId != null)
        {
            await _journalVouchers.CancelAsync(
                entity.JournalVoucherId.Value,
                new CancelJournalVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{entity.AssetNo} {why}" },
                userId);
        }

        entity.JournalVoucherId = null;
        entity.JournalVoucherNo = string.Empty;

        return voucherNo;
    }

    public async Task<FaAssetDto> CreateOpeningAsync(SaveFaAssetDto dto, long userId)
    {
        FaAssets entity = new()
        {
            Source = "Opening",
            Status = Fa.InUse,
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        await ApplyAsync(entity, dto, true, true, true);

        FaCategories category = await _context.Set<FaCategories>().AsNoTracking().FirstAsync(x => x.FaCategoryId == entity.FaCategoryId);

        entity.AssetNo = (await AssetNumbersAsync(_context))(entity.BranchId, category);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        Assets.Add(entity);

        await _context.SaveChangesAsync();

        await PostOpeningAsync(entity, userId);

        Fa.AddHistory(_context, "FaAssets", entity.FaAssetId, "Create", "Opening Asset Added", $"{entity.AssetNo} {entity.Name} : cost Tk {Fa.Money(entity.Cost)}, depreciation to date Tk {Fa.Money(entity.OpeningAccumulated)}{(entity.LastRunPeriod > 0 ? " (up to " + Fa.PeriodText(entity.LastRunPeriod) + ")" : string.Empty)}. Journal Voucher {entity.JournalVoucherNo}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAssetAsync(entity.PublicId);
    }

    public async Task UpdateAssetAsync(Guid publicId, SaveFaAssetDto dto, long userId)
    {
        FaAssets entity =
            await Assets.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset card was not found.");

        FaAssetDto now = await GetAssetAsync(publicId);

        string before = OpeningKey(entity);

        await ApplyAsync(entity, dto, now.CanEditMoney, now.CanEditRule, false);

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // An opening asset whose figures changed (or that has no
        // voucher yet : saved before opening assets were posted) :
        // its voucher is cancelled and written again
        string voucherText = string.Empty;

        if (entity.Source == "Opening" && now.CanEditMoney && (entity.JournalVoucherId == null || OpeningKey(entity) != before))
        {
            string old = await CancelOpeningAsync(entity, "changed : its voucher is written again", userId);

            await PostOpeningAsync(entity, userId);

            voucherText = old.Length > 0
                ? $" Journal Voucher {old} cancelled, {entity.JournalVoucherNo} written."
                : $" Journal Voucher {entity.JournalVoucherNo} written.";
        }

        Fa.AddHistory(_context, "FaAssets", entity.FaAssetId, "Update", "Asset Card Updated", $"{entity.AssetNo} {entity.Name} : {entity.Status}; cost Tk {Fa.Money(entity.Cost + entity.ImprovementCost)}, depreciation Tk {Fa.Money(entity.AccumulatedDepreciation)}.{voucherText}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAssetAsync(Guid publicId, long userId)
    {
        FaAssets entity =
            await Assets.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset card was not found.");

        if (entity.Source != "Opening")
        {
            throw new InvalidOperationException($"{entity.AssetNo} came from an Asset Acquisition : unpost the acquisition to remove it, or dispose of the asset.");
        }

        List<long> one = new() { entity.FaAssetId };

        if ((await DepreciatedAsync(one)).Count > 0 || (await MovedAsync(one)).Count > 0)
        {
            throw new InvalidOperationException($"{entity.AssetNo} was depreciated or disposed : it cannot be deleted. Dispose of it on Asset Disposals.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // out of the ledgers too
        string voucherNo = await CancelOpeningAsync(entity, "deleted", userId);

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaAssets", entity.FaAssetId, "Delete", "Opening Asset Deleted", $"{entity.AssetNo} {entity.Name}{(voucherNo.Length > 0 ? $" : Journal Voucher {voucherNo} cancelled." : string.Empty)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Asset Acquisitions
    //===========================================================

    private async Task<List<FaAcquisitionDto>> ReadAcquisitionsAsync(IQueryable<FaAcquisitions> source, bool withLines)
    {
        List<FaAcquisitions> rows =
            await source.OrderByDescending(x => x.AcquisitionDate).ThenByDescending(x => x.FaAcquisitionId).ToListAsync();

        List<long> ids = rows.Select(x => x.FaAcquisitionId).ToList();

        FaNames names = await Fa.NamesAsync(_context);

        List<FaAcquisitionLines> lines =
            await AcquisitionLines.AsNoTracking()
                .Where(x => ids.Contains(x.FaAcquisitionId))
                .OrderBy(x => x.FaAcquisitionLineId)
                .ToListAsync();

        var cards =
            await Assets.AsNoTracking()
                .Where(x => !x.IsDeleted && x.FaAcquisitionId != null && ids.Contains(x.FaAcquisitionId.Value))
                .OrderBy(x => x.AssetNo)
                .Select(x => new { x.FaAcquisitionId, x.AssetNo })
                .ToListAsync();

        var ledgers = await _ledgers.GetByCodesAsync(rows.Select(x => x.CreditLedgerCode).Where(x => x.Length > 0).Distinct().ToList());

        return rows
            .Select(a => new FaAcquisitionDto
            {
                PublicId = a.PublicId,
                Code = a.Code,
                AcquisitionDate = HrCalendar.Day(a.AcquisitionDate),
                BranchId = a.BranchId,
                BranchName = names.Branch(a.BranchId),
                SupplierName = a.SupplierName,
                RefNo = a.RefNo,
                CreditLedgerCode = a.CreditLedgerCode,
                CreditLedgerType = a.CreditLedgerType,
                CreditLedgerName = ledgers.TryGetValue(a.CreditLedgerCode, out var ledger) ? ledger.LedgerName : string.Empty,
                TotalAmount = a.TotalAmount,
                Status = a.Status,
                JournalVoucherNo = a.JournalVoucherNo,
                Remarks = a.Remarks,
                ItemCount = lines.Count(l => l.FaAcquisitionId == a.FaAcquisitionId),
                AssetNos = cards.Where(c => c.FaAcquisitionId == a.FaAcquisitionId).Select(c => c.AssetNo).ToList(),
                Lines =
                    !withLines
                        ? new List<FaAcquisitionLineDto>()
                        : lines
                            .Where(l => l.FaAcquisitionId == a.FaAcquisitionId)
                            .Select(l => new FaAcquisitionLineDto
                            {
                                FaCategoryId = l.FaCategoryId,
                                CategoryName = names.Category(l.FaCategoryId),
                                Name = l.Name,
                                Brand = l.Brand,
                                Model = l.Model,
                                SerialNo = l.SerialNo,
                                Quantity = l.Quantity,
                                UnitCost = l.UnitCost,
                                Amount = l.Amount,
                                CardMode = l.CardMode,
                                FaLocationId = l.FaLocationId ?? 0,
                                LocationName = names.Location(l.FaLocationId),
                                CustodianEmployeeId = l.CustodianEmployeeId ?? 0,
                                CustodianName = names.Employee(l.CustodianEmployeeId),
                                UseDate = HrCalendar.Day(l.UseDate)
                            })
                            .ToList()
            })
            .ToList();
    }

    public Task<List<FaAcquisitionDto>> GetAcquisitionsAsync() =>
        ReadAcquisitionsAsync(Acquisitions.AsNoTracking().Where(x => !x.IsDeleted), false);

    public async Task<FaAcquisitionDto> GetAcquisitionAsync(Guid publicId) =>
        (await ReadAcquisitionsAsync(Acquisitions.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted), true)).FirstOrDefault()
        ?? throw new KeyNotFoundException("The asset acquisition was not found.");

    // The ledger a document names for its other side : a supplier
    // / customer ledger or a general ledger, never cash or bank.
    // '' : the Posting Setup ledger of the purpose.
    internal static async Task<(string Code, string Type, string Name)> PartyLedgerAsync(AppDbContext context, IVoucherLedgerRepository ledgers, string? code, string purpose, string partyType)
    {
        string wanted = (code ?? string.Empty).Trim();

        // what is bought is payable to a ledger of ONE sub group
        // (Liability For Capital Assets), named by its code
        string subGroup =
            purpose != "ASSET-PURCHASE-PAYABLE"
                ? string.Empty
                : ((await context.Set<FaConfiguration>().AsNoTracking().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync())?.PayableSubGroupCode
                   ?? string.Empty).Trim();

        if (wanted.Length == 0)
        {
            if (subGroup.Length > 0)
            {
                throw new InvalidOperationException("Pick the Payable To ledger.");
            }

            wanted = PostingLedgerCodes.Get(context, purpose);
        }

        var found = await ledgers.GetByCodesAsync(new List<string> { wanted });

        if (!found.TryGetValue(wanted, out var ledger) || !ledger.IsActive)
        {
            throw new InvalidOperationException($"Ledger '{wanted}' was not found or is inactive.");
        }

        if (ledger.IsMoneyLedger)
        {
            throw new InvalidOperationException($"{ledger.LedgerName} is a cash / bank ledger : pick the {partyType.ToLowerInvariant()} or a payable / receivable ledger. The money moves on a Payment / Receipt Voucher.");
        }

        if (subGroup.Length > 0 && !string.Equals((ledger.SubGroupCode ?? string.Empty).Trim(), subGroup, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"{ledger.LedgerName} is not under the account sub group {subGroup} (Liability For Capital Assets) : pick a ledger of that sub group.");
        }

        string type = ledger.LedgerType == partyType ? partyType : Fa.General;

        return (ledger.LedgerCode, type, ledger.LedgerName);
    }

    public async Task<FaAcquisitionDto> SaveAcquisitionAsync(Guid? publicId, FaAcquisitionDto dto, long userId)
    {
        FaConfigurationDto config = await _setup.GetConfigurationAsync();

        DateOnly date =
            HrCalendar.ParseDay(dto.AcquisitionDate)
            ?? throw new InvalidOperationException("Date is required.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date cannot be in the future.");
        }

        if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the branch.");
        }

        var credit = await PartyLedgerAsync(_context, _ledgers, dto.CreditLedgerCode, "ASSET-PURCHASE-PAYABLE", "Supplier");

        List<FaAcquisitionLineDto> rows = dto.Lines ?? new List<FaAcquisitionLineDto>();

        if (rows.Count == 0)
        {
            throw new InvalidOperationException("Add at least one item.");
        }

        Dictionary<long, FaCategories> categories =
            (await _context.Set<FaCategories>().AsNoTracking().Where(x => !x.IsDeleted).ToListAsync()).ToDictionary(x => x.FaCategoryId);

        List<long> branchLocations =
            await _context.Set<FaLocations>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.BranchId == dto.BranchId)
                .Select(x => x.FaLocationId)
                .ToListAsync();

        List<FaAcquisitionLines> lines = new();

        int no = 0;

        foreach (FaAcquisitionLineDto row in rows)
        {
            no++;

            string label = $"Item {no}";

            if (!categories.TryGetValue(row.FaCategoryId, out FaCategories? category) || !category.IsActive)
            {
                throw new InvalidOperationException($"{label} : pick an active asset group.");
            }

            Fa.NeedDeclared(category);

            string name = Fa.Clean(row.Name, 150, $"{label} name");

            if (name.Length == 0)
            {
                throw new InvalidOperationException($"{label} : the name is required.");
            }

            string mode = string.Equals(row.CardMode, "Group", StringComparison.OrdinalIgnoreCase) ? "Group" : "Each";

            decimal quantity = Math.Round(row.Quantity, 2);

            decimal unit = Fa.Round(row.UnitCost);

            if (quantity <= 0 || unit <= 0)
            {
                throw new InvalidOperationException($"{label} : the quantity and the unit cost must be more than 0.");
            }

            if (mode == "Each" && (quantity != Math.Floor(quantity) || quantity > 500))
            {
                throw new InvalidOperationException($"{label} : one card an item needs a whole quantity (500 at most). Use a group card for the rest.");
            }

            if (mode == "Group" && !category.AllowGroupCard)
            {
                throw new InvalidOperationException($"{label} : {category.Name} does not allow one card for many items.");
            }

            if (category.CapitalThreshold > 0 && unit < category.CapitalThreshold)
            {
                throw new InvalidOperationException($"{label} : Tk {Fa.Money(unit)} an item is below the capitalisation limit of {category.Name} (Tk {Fa.Money(category.CapitalThreshold)}). Book it as an expense, not an asset.");
            }

            long? locationId = row.FaLocationId > 0 ? row.FaLocationId : null;

            if (locationId != null && !branchLocations.Contains(locationId.Value))
            {
                throw new InvalidOperationException($"{label} : the location is not a location of the branch.");
            }

            if (locationId == null && config.RequireLocation)
            {
                throw new InvalidOperationException($"{label} : pick the location (Asset Configuration asks for it).");
            }

            long? custodianId = row.CustodianEmployeeId > 0 ? row.CustodianEmployeeId : null;

            if (custodianId == null && config.RequireCustodian)
            {
                throw new InvalidOperationException($"{label} : pick the custodian (Asset Configuration asks for it).");
            }

            DateOnly use = HrCalendar.ParseDay(row.UseDate) ?? date;

            if (use < date)
            {
                throw new InvalidOperationException($"{label} : it cannot be put to use before the acquisition date.");
            }

            lines.Add(
                new FaAcquisitionLines
                {
                    FaCategoryId = category.FaCategoryId,
                    Name = name,
                    Brand = Fa.Clean(row.Brand, 100, $"{label} brand"),
                    Model = Fa.Clean(row.Model, 100, $"{label} model"),
                    SerialNo = Fa.Clean(row.SerialNo, 100, $"{label} serial no"),
                    Quantity = quantity,
                    UnitCost = unit,
                    Amount = Fa.Round(quantity * unit),
                    CardMode = mode,
                    FaLocationId = locationId,
                    CustodianEmployeeId = custodianId,
                    UseDate = use
                });
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FaAcquisitions entity;

        if (publicId == null)
        {
            entity = new FaAcquisitions
            {
                Code = Fa.NextCode(await Acquisitions.AsNoTracking().Select(x => x.Code).ToListAsync(), "FAQ-"),
                Status = Draft,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            Acquisitions.Add(entity);
        }
        else
        {
            entity =
                await Acquisitions.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The asset acquisition was not found.");

            if (entity.Status != Draft)
            {
                throw new InvalidOperationException($"{entity.Code} is {entity.Status} : only a Draft is changed. Unpost it first.");
            }

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;

            AcquisitionLines.RemoveRange(await AcquisitionLines.Where(x => x.FaAcquisitionId == entity.FaAcquisitionId).ToListAsync());
        }

        entity.AcquisitionDate = date;
        entity.BranchId = dto.BranchId;
        entity.SupplierName = Fa.Clean(dto.SupplierName, 150, "Supplier");
        entity.RefNo = Fa.Clean(dto.RefNo, 60, "Reference No");
        entity.CreditLedgerCode = credit.Code;
        entity.CreditLedgerType = credit.Type;
        entity.TotalAmount = lines.Sum(x => x.Amount);
        entity.Remarks = Fa.Clean(dto.Remarks, 500, "Remarks");

        await _context.SaveChangesAsync();

        foreach (FaAcquisitionLines line in lines)
        {
            line.FaAcquisitionId = entity.FaAcquisitionId;

            AcquisitionLines.Add(line);
        }

        Fa.AddHistory(_context, "FaAcquisitions", entity.FaAcquisitionId, publicId == null ? "Create" : "Update", publicId == null ? "Asset Acquisition Saved" : "Asset Acquisition Updated", $"{entity.Code} : {lines.Count} item(s), Tk {Fa.Money(entity.TotalAmount)}, payable to {credit.Name}. Draft.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAcquisitionAsync(entity.PublicId);
    }

    public async Task PostAcquisitionAsync(Guid publicId, long userId)
    {
        FaAcquisitions entity =
            await Acquisitions.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset acquisition was not found.");

        if (entity.Status != Draft)
        {
            throw new InvalidOperationException($"{entity.Code} is {entity.Status} already.");
        }

        List<FaAcquisitionLines> lines =
            await AcquisitionLines.AsNoTracking().Where(x => x.FaAcquisitionId == entity.FaAcquisitionId).OrderBy(x => x.FaAcquisitionLineId).ToListAsync();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException($"{entity.Code} has no item.");
        }

        Dictionary<long, FaCategories> categories =
            (await _context.Set<FaCategories>().AsNoTracking().ToListAsync()).ToDictionary(x => x.FaCategoryId);

        foreach (FaAcquisitionLines line in lines)
        {
            Fa.NeedLedgers(categories[line.FaCategoryId]);
        }

        // Dr the cost ledger of each category / Cr the one payable
        List<JournalVoucherLineDto> voucherLines =
            lines
                .GroupBy(x => categories[x.FaCategoryId].CostLedgerCode)
                .Select(g => Fa.Debit(1, g.Key, g.Sum(x => x.Amount), $"Assets bought {entity.Code}"))
                .ToList();

        decimal total = lines.Sum(x => x.Amount);

        voucherLines.Add(Fa.Credit(1, entity.CreditLedgerCode, total, $"Assets bought {entity.Code}{(entity.RefNo.Length > 0 ? " / " + entity.RefNo : string.Empty)}", entity.CreditLedgerType));

        await using var transaction = await _context.Database.BeginTransactionAsync();

        JournalVoucherSavedDto voucher =
            await _journalVouchers.CreatePostedAsync(
                new CreateJournalVoucherDto
                {
                    VoucherDate = HrCalendar.Day(entity.AcquisitionDate),
                    BranchId = entity.BranchId,
                    Narration = $"Fixed assets bought{(entity.SupplierName.Length > 0 ? " from " + entity.SupplierName : string.Empty)} : {lines.Count} item(s), Tk {Fa.Money(total)} | {entity.Code}",
                    Lines = voucherLines
                },
                entity.Code,
                userId);

        // the asset cards
        Func<long, FaCategories, string> nextNo = await AssetNumbersAsync(_context);

        int cards = 0;

        foreach (FaAcquisitionLines line in lines)
        {
            FaCategories category = categories[line.FaCategoryId];

            int count = line.CardMode == "Group" ? 1 : (int)line.Quantity;

            for (int i = 0; i < count; i++)
            {
                decimal cost = line.CardMode == "Group" ? line.Amount : line.UnitCost;

                Assets.Add(
                    new FaAssets
                    {
                        AssetNo = nextNo(entity.BranchId, category),
                        Name = line.Name,
                        FaCategoryId = category.FaCategoryId,
                        Brand = line.Brand,
                        Model = line.Model,
                        // a serial no is of one item
                        SerialNo = count == 1 ? line.SerialNo : string.Empty,
                        BranchId = entity.BranchId,
                        FaLocationId = line.FaLocationId,
                        CustodianEmployeeId = line.CustodianEmployeeId,
                        SupplierName = entity.SupplierName,
                        PurchaseRef = entity.RefNo.Length > 0 ? entity.RefNo : entity.Code,
                        PurchaseDate = entity.AcquisitionDate,
                        UseDate = line.UseDate,
                        Quantity = line.CardMode == "Group" ? line.Quantity : 1,
                        Cost = cost,
                        ResidualValue = Fa.Round(cost * category.ResidualPercent / 100m),
                        Method = category.Method,
                        RatePercent = category.RatePercent,
                        LifeYears = category.LifeYears,
                        Status = Fa.InUse,
                        Source = "Acquisition",
                        FaAcquisitionId = entity.FaAcquisitionId,
                        IsDeleted = false,
                        CreatedBy = userId,
                        CreatedDate = DateTime.UtcNow
                    });

                cards++;
            }
        }

        entity.Status = Posted;
        entity.TotalAmount = total;
        entity.PostedBy = userId;
        entity.PostedDate = DateTime.UtcNow;
        entity.JournalVoucherId = voucher.JournalVoucherId;
        entity.JournalVoucherNo = Fa.Short(voucher.VoucherNo);
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaAcquisitions", entity.FaAcquisitionId, "Post", "Asset Acquisition Posted", $"{entity.Code} : Tk {Fa.Money(total)}, {cards} asset card(s) made. Journal Voucher {entity.JournalVoucherNo}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task UnpostAcquisitionAsync(Guid publicId, FaReasonDto dto, long userId)
    {
        FaAcquisitions entity =
            await Acquisitions.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset acquisition was not found.");

        if (entity.Status != Posted)
        {
            throw new InvalidOperationException($"{entity.Code} is not posted.");
        }

        string reason = Fa.Clean(dto?.Reason, 300, "Reason");

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Write why the acquisition is unposted.");
        }

        List<FaAssets> cards = await Assets.Where(x => !x.IsDeleted && x.FaAcquisitionId == entity.FaAcquisitionId).ToListAsync();

        List<long> ids = cards.Select(x => x.FaAssetId).ToList();

        HashSet<long> touched = await DepreciatedAsync(ids);

        touched.UnionWith(await MovedAsync(ids));

        if (touched.Count > 0)
        {
            string which = string.Join(", ", cards.Where(x => touched.Contains(x.FaAssetId)).Select(x => x.AssetNo).Take(5));

            throw new InvalidOperationException($"{entity.Code} cannot be unposted : {which} was depreciated, moved or disposed. Undo that first.");
        }

        string voucherNo = entity.JournalVoucherNo;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (entity.JournalVoucherId != null)
        {
            await _journalVouchers.CancelAsync(
                entity.JournalVoucherId.Value,
                new CancelJournalVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{entity.Code} unposted : {reason}" },
                userId);
        }

        foreach (FaAssets card in cards)
        {
            card.IsDeleted = true;
            card.DeletedBy = userId;
            card.DeletedDate = DateTime.UtcNow;
        }

        entity.Status = Draft;
        entity.PostedBy = null;
        entity.PostedDate = null;
        entity.JournalVoucherId = null;
        entity.JournalVoucherNo = string.Empty;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaAcquisitions", entity.FaAcquisitionId, "Cancel", "Asset Acquisition Unposted", $"{entity.Code} : Journal Voucher {voucherNo} cancelled, {cards.Count} asset card(s) removed. Reason : {reason}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAcquisitionAsync(Guid publicId, long userId)
    {
        FaAcquisitions entity =
            await Acquisitions.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset acquisition was not found.");

        if (entity.Status != Draft)
        {
            throw new InvalidOperationException($"{entity.Code} is {entity.Status} : only a Draft is deleted. Unpost it first.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaAcquisitions", entity.FaAcquisitionId, "Delete", "Asset Acquisition Deleted", $"{entity.Code}", userId);

        await _context.SaveChangesAsync();
    }
}
