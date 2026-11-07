//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.AccountsFinance.FinancialStatements;
using AppCore.Application.Platform.Accounting;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;

using VoucherEntriesEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using FinancialYearsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.FinancialYears;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using BranchAssignmentEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.BranchAssignment;

using BranchAssignmentDetailEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.BranchAssignmentDetail;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.AccountsFinance.FinancialStatements;


//===============================================================
// Trial Balance repository (read only)
//
// Source : VoucherEntries (every posted line; never edited).
// Ledgers : the voucher ledger list (GL incl. INV / WIP / COGS,
// customer and supplier ledgers + Cash / Bank / MFS / POS / EMI).
// A posted code that is no longer in the list still shows
// ("Not in the chart"), so the report always adds up.
//
//   Opening : Σ(Debit − Credit) before From. Income / expense
//             ledgers count from the start of the financial year
//             that holds From.
//   Earlier years' result : Σ(Debit − Credit) of the income /
//             expense ledgers before that year start. It is added
//             to the opening of Retained Earnings (Posting Setup
//             RETAINED-EARNINGS), so Dr = Cr without a year-end
//             closing voucher.
//   Hidden cancelled (default) : a voucher reversed on or before
//             To and its reversal are left out.
//   Branches : one allotted branch, or all of them (0).
//===============================================================

public class TrialBalanceRepository
    : ITrialBalanceRepository
{
    private readonly AppDbContext _context;

    private readonly IVoucherLedgerRepository _ledgers;


    //===========================================================
    // Constants
    //===========================================================

    private const string DateFormat = "yyyy-MM-dd";

    private const string Dr = "Dr";

    private const string Cr = "Cr";

    private const string RetainedEarningsPurpose = "RETAINED-EARNINGS";

    private const string NotInChart = "Not in the chart";

    // Class words of income / expense (nominal) ledgers
    private static readonly string[] NominalWords =
    {
        "income",
        "revenue",
        "sale",
        "expense",
        "expenditure",
        "cost"
    };

    // Class words of credit-side ledgers (when no mode is set)
    private static readonly string[] CreditWords =
    {
        "liabilit",
        "equity",
        "capital",
        "income",
        "revenue",
        "sale",
        "payable",
        "reserve"
    };


    public TrialBalanceRepository(
        AppDbContext context,
        IVoucherLedgerRepository ledgers)
    {
        _context = context;

        _ledgers = ledgers;
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));


    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);


    private static DateOnly? ParseDate(string? text) =>
        DateOnly.TryParseExact(
            (text ?? string.Empty).Trim(),
            DateFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out DateOnly date)
            ? date
            : null;


    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);


    private static string Clean(string? value) =>
        (value ?? string.Empty).Trim();


    // Empty From = this month's first day; empty To = today;
    // From after To = swapped
    private static (DateOnly From, DateOnly To) Period
    (
        string? from,
        string? to
    )
    {
        DateOnly today =
            Today();

        DateOnly start =
            ParseDate(from)
            ?? new DateOnly(today.Year, today.Month, 1);

        DateOnly end =
            ParseDate(to)
            ?? today;

        return start <= end
            ? (start, end)
            : (end, start);
    }


    // "Debit" / "Dr" → Dr ; "Credit" / "Cr" → Cr (first one set)
    private static string NormalMode
    (
        params string?[] modes
    )
    {
        foreach (string? mode in modes)
        {
            string text =
                Clean(mode);

            if (text.StartsWith("d", StringComparison.OrdinalIgnoreCase))
            {
                return Dr;
            }

            if (text.StartsWith("c", StringComparison.OrdinalIgnoreCase))
            {
                return Cr;
            }
        }

        return string.Empty;
    }


    private static bool HasWord
    (
        string[] words,
        params string?[] texts
    )
    {
        string text =
            string.Join(" ", texts).ToLowerInvariant();

        return words.Any(word => text.Contains(word));
    }


    // Class order : CLS (chart of accounts) → INV → WIP → COGS →
    // others → not in the chart
    private static int ClassRank
    (
        string classCode
    )
    {
        string code =
            classCode.ToUpperInvariant();

        if (code.Length == 0) return 9;
        if (code.StartsWith("CLS-")) return 0;
        if (code.StartsWith("INV-")) return 1;
        if (code.StartsWith("WIP-")) return 2;
        if (code.StartsWith("COGS-")) return 3;

        return 4;
    }


    //===========================================================
    // Branches the user is allotted to
    //===========================================================

    public async Task<List<TrialBalanceBranchDto>> GetBranchesAsync
    (
        long userId
    )
    {
        var branches =
            await
            (
            from assignment in _context.Set<BranchAssignmentEntity>().AsNoTracking()

            join detail in _context.Set<BranchAssignmentDetailEntity>().AsNoTracking()
                on assignment.BranchAssignmentId equals detail.BranchAssignmentId

            join branch in _context.Set<BranchesEntity>().AsNoTracking()
                on detail.BranchId equals branch.BranchId

            where assignment.UserProfileId == userId
                  && assignment.IsActive
                  && !assignment.IsDeleted
                  && detail.IsActive
                  && !detail.IsDeleted
                  && branch.IsActive
                  && !branch.IsDeleted

            select new
            {
                branch.BranchId,
                branch.BranchCode,
                branch.BranchName
            }
            )
            .Distinct()
            .ToListAsync();

        return branches
            .Select
            (
                x =>
                    new TrialBalanceBranchDto
                    {
                        Id = x.BranchId,
                        Code = x.BranchCode ?? string.Empty,
                        Name = x.BranchName ?? string.Empty
                    }
            )
            .OrderBy(x => x.Name)
            .ToList();
    }


    // Start of the financial year that holds the date (none = null)
    private async Task<DateOnly?> YearStartAsync
    (
        DateOnly date
    )
    {
        List<DateOnly> starts =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.StartDate <= date && x.EndDate >= date)
                .Select(x => x.StartDate)
                .ToListAsync();

        return starts.Count == 0
            ? null
            : starts.Max();
    }


    //===========================================================
    // Trial Balance
    //===========================================================

    public async Task<TrialBalanceDto> GetTrialBalanceAsync
    (
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled
    )
    {
        (DateOnly start, DateOnly end) =
            Period(from, to);

        //=======================================================
        // Branches : allotted ones only
        //=======================================================

        List<TrialBalanceBranchDto> allotted =
            await GetBranchesAsync(userId);

        if (allotted.Count == 0)
        {
            throw new InvalidOperationException(
                "You are not allotted to any branch (Security & Permission > Branch Assignment).");
        }

        List<long> branchIds;

        string branchName;

        if (branchId == 0)
        {
            branchIds =
                allotted.Select(x => x.Id).ToList();

            branchName =
                allotted.Count == 1
                    ? allotted[0].Name
                    : $"All allotted branches ({allotted.Count})";
        }
        else
        {
            TrialBalanceBranchDto? branch =
                allotted.FirstOrDefault(x => x.Id == branchId);

            if (branch == null)
            {
                throw new InvalidOperationException(
                    "You are not allotted to this branch (Security & Permission > Branch Assignment).");
            }

            branchIds =
                new List<long> { branch.Id };

            branchName =
                branch.Name;
        }

        //=======================================================
        // Year start (income / expense count from here)
        //=======================================================

        DateOnly? yearStart =
            await YearStartAsync(start);

        // No financial year : no year boundary (nothing moves to
        // Retained Earnings)
        DateOnly cut =
            yearStart ?? DateOnly.MinValue;

        //=======================================================
        // Lines up to To, branch filtered, without cancelled
        // vouchers (reversed on or before To) when hidden
        //=======================================================

        IQueryable<VoucherEntriesEntity> lines =
            _context
                .Set<VoucherEntriesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        branchIds.Contains(x.BranchId)
                        &&
                        x.VoucherDate <= end
                );

        if (!showCancelled)
        {
            List<string> cancelled =
                await lines
                    .Where(x => x.IsReversal)
                    .Select(x => x.VoucherNo)
                    .Distinct()
                    .ToListAsync();

            if (cancelled.Count > 0)
            {
                lines =
                    lines.Where(x => !cancelled.Contains(x.VoucherNo));
            }
        }

        var sums =
            await lines
                .GroupBy(x => x.LedgerCode)
                .Select
                (
                    g =>
                        new
                        {
                            Code = g.Key,
                            Name = g.Max(x => x.LedgerName),
                            BeforeFrom = g.Sum(x => x.VoucherDate < start ? x.Debit - x.Credit : 0m),
                            BeforeYear = g.Sum(x => x.VoucherDate < cut ? x.Debit - x.Credit : 0m),
                            PeriodDebit = g.Sum(x => x.VoucherDate >= start ? x.Debit : 0m),
                            PeriodCredit = g.Sum(x => x.VoucherDate >= start ? x.Credit : 0m)
                        }
                )
                .ToListAsync();

        var sumByCode =
            sums
                .GroupBy(x => Clean(x.Code).ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.First());

        //=======================================================
        // Chart : ledgers, classes, groups, modes
        //=======================================================

        List<VoucherLedgerDto> ledgers =
            await _ledgers.GetAllAsync(false);

        var classes =
            (await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.ClassCode, x.ClassName, x.ClassType, x.Mode })
                .ToListAsync())
            .Where(x => !string.IsNullOrWhiteSpace(x.ClassCode))
            .GroupBy(x => x.ClassCode.Trim().ToUpperInvariant())
            .ToDictionary(g => g.Key, g => g.First());

        var groups =
            (await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.GroupCode, x.GroupName, x.Mode })
                .ToListAsync())
            .Where(x => !string.IsNullOrWhiteSpace(x.GroupCode))
            .GroupBy(x => x.GroupCode!.Trim().ToUpperInvariant())
            .ToDictionary(g => g.Key, g => g.First());

        Dictionary<string, string> glModes =
            (await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.LedgerCode, x.Mode })
                .ToListAsync())
            .Where(x => !string.IsNullOrWhiteSpace(x.LedgerCode))
            .GroupBy(x => x.LedgerCode!.Trim().ToUpperInvariant())
            .ToDictionary(g => g.Key, g => g.First().Mode ?? string.Empty);

        //=======================================================
        // Retained Earnings (Posting Setup)
        //=======================================================

        string retainedCode =
            PostingLedgerCodes.TryGet(_context, RetainedEarningsPurpose).ToUpperInvariant();

        TrialBalanceDto result =
            new()
            {
                From = DateText(start),
                To = DateText(end),
                BranchId = branchId,
                BranchName = branchName,
                ShowCancelled = showCancelled,
                YearStart = yearStart.HasValue ? DateText(yearStart.Value) : string.Empty
            };

        //=======================================================
        // Rows
        //=======================================================

        decimal priorYears = 0m;

        HashSet<string> seen =
            new(StringComparer.OrdinalIgnoreCase);

        List<TrialBalanceRowDto> rows =
            new();

        foreach (VoucherLedgerDto ledger in ledgers)
        {
            string code =
                Clean(ledger.LedgerCode).ToUpperInvariant();

            if (code.Length == 0 || !seen.Add(code))
            {
                continue;
            }

            string classKey =
                Clean(ledger.ClassCode).ToUpperInvariant();

            string groupKey =
                Clean(ledger.GroupCode).ToUpperInvariant();

            var cls =
                classes.GetValueOrDefault(classKey);

            var grp =
                groups.GetValueOrDefault(groupKey);

            bool nominal =
                HasWord(NominalWords, cls?.ClassType, cls?.ClassName);

            string mode =
                NormalMode(glModes.GetValueOrDefault(code), grp?.Mode, cls?.Mode) is { Length: > 0 } chosen
                    ? chosen
                    : HasWord(CreditWords, cls?.ClassType, cls?.ClassName) ? Cr : Dr;

            TrialBalanceRowDto row =
                new()
                {
                    LedgerCode = ledger.LedgerCode,
                    LedgerName = ledger.LedgerName,
                    LedgerType = ledger.LedgerType,
                    ClassCode = Clean(ledger.ClassCode),
                    ClassName = cls?.ClassName ?? Clean(ledger.ClassCode),
                    GroupCode = Clean(ledger.GroupCode),
                    GroupName = grp?.GroupName ?? Clean(ledger.GroupCode),
                    SubGroupCode = Clean(ledger.SubGroupCode),
                    SubGroupName = Clean(ledger.SubGroupName).Length > 0 ? Clean(ledger.SubGroupName) : Clean(ledger.SubGroupCode),
                    Mode = mode,
                    IsNominal = nominal,
                    IsActive = ledger.IsActive
                };

            if (sumByCode.TryGetValue(code, out var sum))
            {
                row.HasEntries = true;

                row.Opening =
                    nominal
                        ? sum.BeforeFrom - sum.BeforeYear
                        : sum.BeforeFrom;

                row.Debit = sum.PeriodDebit;

                row.Credit = sum.PeriodCredit;

                if (nominal)
                {
                    priorYears += sum.BeforeYear;
                }
            }

            rows.Add(row);
        }

        // Posted codes no longer in the chart (deleted ledgers)
        foreach (var sum in sums)
        {
            string code =
                Clean(sum.Code).ToUpperInvariant();

            if (code.Length == 0 || seen.Contains(code))
            {
                continue;
            }

            seen.Add(code);

            rows.Add(
                new TrialBalanceRowDto
                {
                    LedgerCode = sum.Code,
                    LedgerName = Clean(sum.Name).Length > 0 ? Clean(sum.Name) : sum.Code,
                    ClassName = NotInChart,
                    Mode = Dr,
                    IsActive = false,
                    HasEntries = true,
                    Opening = sum.BeforeFrom,
                    Debit = sum.PeriodDebit,
                    Credit = sum.PeriodCredit
                });
        }

        //=======================================================
        // Earlier years' result → Retained Earnings opening
        //=======================================================

        priorYears = Money(priorYears);

        result.PriorYearsResult = priorYears;

        TrialBalanceRowDto? retained =
            retainedCode.Length == 0
                ? null
                : rows.FirstOrDefault(x => string.Equals(x.LedgerCode, retainedCode, StringComparison.OrdinalIgnoreCase));

        if (retained != null)
        {
            retained.IsRetainedEarnings = true;

            retained.Opening += priorYears;

            retained.HasEntries = retained.HasEntries || priorYears != 0m;

            result.RetainedEarningsCode = retained.LedgerCode;

            result.RetainedEarningsName = retained.LedgerName;
        }
        else
        {
            result.Message =
                retainedCode.Length == 0
                    ? "Retained Earnings is not set : choose its ledger on Settings > Account Settings > Posting Setup (run TrialBalance_Navigation.sql first if it is not listed there)."
                    : $"Retained Earnings ledger {retainedCode} (Posting Setup) was not found : choose it again on Settings > Account Settings > Posting Setup.";

            if (priorYears != 0m)
            {
                rows.Add(
                    new TrialBalanceRowDto
                    {
                        LedgerCode = RetainedEarningsPurpose,
                        LedgerName = "Profit & Loss of earlier years",
                        ClassName = NotInChart,
                        Mode = Cr,
                        IsActive = true,
                        IsRetainedEarnings = true,
                        HasEntries = true,
                        Opening = priorYears
                    });
            }
        }

        //=======================================================
        // Closing, rounding, totals
        //=======================================================

        foreach (TrialBalanceRowDto row in rows)
        {
            row.Opening = Money(row.Opening);

            row.Debit = Money(row.Debit);

            row.Credit = Money(row.Credit);

            row.Closing = Money(row.Opening + row.Debit - row.Credit);
        }

        result.OpeningDebit = rows.Where(x => x.Opening > 0).Sum(x => x.Opening);

        result.OpeningCredit = -rows.Where(x => x.Opening < 0).Sum(x => x.Opening);

        result.PeriodDebit = rows.Sum(x => x.Debit);

        result.PeriodCredit = rows.Sum(x => x.Credit);

        result.ClosingDebit = rows.Where(x => x.Closing > 0).Sum(x => x.Closing);

        result.ClosingCredit = -rows.Where(x => x.Closing < 0).Sum(x => x.Closing);

        result.Difference = Money(result.ClosingDebit - result.ClosingCredit);

        result.Rows =
            rows
                .OrderBy(x => ClassRank(x.ClassCode))
                .ThenBy(x => x.ClassCode)
                .ThenBy(x => x.GroupCode)
                .ThenBy(x => x.SubGroupCode)
                .ThenBy(x => x.LedgerCode)
                .ToList();

        return result;
    }
}
