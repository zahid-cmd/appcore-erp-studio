//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.AccountsFinance.FinancialStatements;
using AppCore.Infrastructure.Persistence;

using FinancialYearsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.FinancialYears;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.AccountsFinance.FinancialStatements;


//===============================================================
// Final Accounts repository (read only)
//
// Built on the Trial Balance engine (ITrialBalanceRepository) :
// the same ledgers, branch check, cancelled rule and income /
// expense rule. Nothing new is posted or stored.
//
// Profit & Loss (From - To)
//   Income / expense ledgers, their period Dr / Cr only.
//   Section by class :
//     COGS-... class (or "cost of")        cogs
//     income / revenue / sale + "other"    other-income
//     income / revenue / sale              sales
//     anything else                        expense
//   Business line : sales by the class name (bike / spare parts
//   / accessories / service); cost of goods sold by the product
//   category whose COGS group the ledger sits in (CategoryType).
//
// Balance Sheet (as on a date)
//   Trial Balance with From = To = the date. Balance-sheet
//   ledgers by their closing; the income / expense closings (from
//   the year start) make the Profit for the year to date.
//   Assets - (Liabilities + Equity + Profit to date) = the Trial
//   Balance difference (0 when the books balance).
//===============================================================

public class FinalAccountsRepository
    : IFinalAccountsRepository
{
    private readonly AppDbContext _context;

    private readonly ITrialBalanceRepository _trialBalance;


    //===========================================================
    // Constants
    //===========================================================

    private const string DateFormat = "yyyy-MM-dd";

    private const string Cr = "Cr";

    // Business lines
    private const string LineBikes = "mb";

    private const string LineParts = "sp";

    private const string LineAccessories = "ac";

    private const string LineService = "service";


    public FinalAccountsRepository(
        AppDbContext context,
        ITrialBalanceRepository trialBalance)
    {
        _context = context;

        _trialBalance = trialBalance;
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


    private static bool Has
    (
        string text,
        params string[] words
    ) =>
        words.Any(word => text.Contains(word, StringComparison.OrdinalIgnoreCase));


    private static bool IsLastDayOfMonth(DateOnly date) =>
        date.Day == DateTime.DaysInMonth(date.Year, date.Month);


    // Financial year that holds the date (latest start wins)
    private async Task<(DateOnly Start, DateOnly End)?> YearOfAsync
    (
        DateOnly date
    )
    {
        var years =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.StartDate <= date && x.EndDate >= date)
                .Select(x => new { x.StartDate, x.EndDate })
                .ToListAsync();

        if (years.Count == 0)
        {
            return null;
        }

        var year =
            years
                .OrderByDescending(x => x.StartDate)
                .First();

        return (year.StartDate, year.EndDate);
    }


    // Business line from a name : accessories, spare parts /
    // lubricants, service, motor bikes ("" = none)
    private static string LineOf
    (
        params string?[] texts
    )
    {
        foreach (string? value in texts)
        {
            string text =
                Clean(value);

            if (text.Length == 0)
            {
                continue;
            }

            if (Has(text, "accessor"))
            {
                return LineAccessories;
            }

            if (Has(text, "spare", "lubric", "part"))
            {
                return LineParts;
            }

            if (Has(text, "service"))
            {
                return LineService;
            }

            if (Has(text, "bike", "motor"))
            {
                return LineBikes;
            }
        }

        return string.Empty;
    }


    // COGS account group → business line (Product Categories)
    private async Task<Dictionary<string, string>> CogsLinesAsync()
    {
        var categories =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.CogsGroupCode, x.CategoryType })
                .ToListAsync();

        Dictionary<string, string> lines =
            new(StringComparer.OrdinalIgnoreCase);

        foreach (var category in categories)
        {
            string code =
                Clean(category.CogsGroupCode);

            string line =
                LineOf(category.CategoryType);

            if (code.Length > 0 && line.Length > 0 && !lines.ContainsKey(code))
            {
                lines[code] = line;
            }
        }

        return lines;
    }


    // Section of an income / expense ledger
    private static string ProfitLossSection
    (
        TrialBalanceRowDto row
    )
    {
        string code =
            Clean(row.ClassCode).ToUpperInvariant();

        string name =
            Clean(row.ClassName);

        if (code.StartsWith("COGS-") || Has(name, "cost of"))
        {
            return FinalAccountsSections.Cogs;
        }

        if (Has(name, "income", "revenue", "sale"))
        {
            return Has(name, "other")
                ? FinalAccountsSections.OtherIncome
                : FinalAccountsSections.Sales;
        }

        return FinalAccountsSections.Expense;
    }


    // Section of a balance-sheet ledger
    private static string BalanceSheetSection
    (
        TrialBalanceRowDto row
    )
    {
        if (row.IsRetainedEarnings)
        {
            return FinalAccountsSections.Equity;
        }

        string code =
            Clean(row.ClassCode).ToUpperInvariant();

        string name =
            Clean(row.ClassName);

        if (code.StartsWith("INV-") || code.StartsWith("WIP-"))
        {
            return FinalAccountsSections.Asset;
        }

        if (Has(name, "equity", "capital", "reserve"))
        {
            return FinalAccountsSections.Equity;
        }

        if (Has(name, "liabilit", "payable", "loan", "borrow"))
        {
            return FinalAccountsSections.Liability;
        }

        if (Has(name, "asset", "receivable", "inventor", "stock", "progress"))
        {
            return FinalAccountsSections.Asset;
        }

        // Not in the chart / unknown class : by its normal side
        return string.Equals(row.Mode, Cr, StringComparison.OrdinalIgnoreCase)
            ? FinalAccountsSections.Liability
            : FinalAccountsSections.Asset;
    }


    private static int SectionRank
    (
        string section
    ) =>
        section switch
        {
            FinalAccountsSections.Sales => 0,
            FinalAccountsSections.Cogs => 1,
            FinalAccountsSections.OtherIncome => 2,
            FinalAccountsSections.Expense => 3,
            FinalAccountsSections.Asset => 4,
            FinalAccountsSections.Liability => 5,
            FinalAccountsSections.Equity => 6,
            _ => 9
        };


    private static bool IsIncome
    (
        string section
    ) =>
        section == FinalAccountsSections.Sales
        || section == FinalAccountsSections.OtherIncome;


    private static FinalAccountsRowDto NewRow
    (
        TrialBalanceRowDto row,
        string section
    ) =>
        new()
        {
            LedgerCode = row.LedgerCode,
            LedgerName = row.LedgerName,
            LedgerType = row.LedgerType,
            ClassCode = row.ClassCode,
            ClassName = row.ClassName,
            GroupCode = row.GroupCode,
            GroupName = row.GroupName,
            SubGroupCode = row.SubGroupCode,
            SubGroupName = row.SubGroupName,
            IsActive = row.IsActive,
            IsRetainedEarnings = row.IsRetainedEarnings,
            Section = section
        };


    // Rows of the current and the comparison report, matched by
    // ledger code; a ledger posted in only one of them still shows
    private static List<FinalAccountsRowDto> Merge
    (
        TrialBalanceDto current,
        TrialBalanceDto? compare,
        Func<TrialBalanceRowDto, bool> take,
        Func<TrialBalanceRowDto, string> section,
        Func<TrialBalanceRowDto, string, decimal> amount
    )
    {
        Dictionary<string, FinalAccountsRowDto> byCode =
            new(StringComparer.OrdinalIgnoreCase);

        List<FinalAccountsRowDto> rows =
            new();

        // Retained Earnings always comes (the Balance Sheet shows
        // the profit / loss for the year to date inside it)
        foreach (TrialBalanceRowDto row in current.Rows)
        {
            if ((!row.HasEntries && !row.IsRetainedEarnings) || !take(row))
            {
                continue;
            }

            string code =
                Clean(row.LedgerCode);

            if (code.Length == 0 || byCode.ContainsKey(code))
            {
                continue;
            }

            FinalAccountsRowDto item =
                NewRow(row, section(row));

            item.Amount =
                Money(amount(row, item.Section));

            byCode[code] = item;

            rows.Add(item);
        }

        if (compare != null)
        {
            foreach (TrialBalanceRowDto row in compare.Rows)
            {
                if ((!row.HasEntries && !row.IsRetainedEarnings) || !take(row))
                {
                    continue;
                }

                string code =
                    Clean(row.LedgerCode);

                if (code.Length == 0)
                {
                    continue;
                }

                if (!byCode.TryGetValue(code, out FinalAccountsRowDto? item))
                {
                    item =
                        NewRow(row, section(row));

                    byCode[code] = item;

                    rows.Add(item);
                }

                item.CompareAmount =
                    Money(amount(row, item.Section));
            }
        }

        return rows
            .OrderBy(x => SectionRank(x.Section))
            .ThenBy(x => x.ClassCode)
            .ThenBy(x => x.GroupCode)
            .ThenBy(x => x.SubGroupCode)
            .ThenBy(x => x.LedgerCode)
            .ToList();
    }


    private static string JoinMessages
    (
        params string?[] messages
    ) =>
        string.Join(
            " ",
            messages
                .Select(Clean)
                .Where(x => x.Length > 0)
                .Distinct());


    //===========================================================
    // Financial year of a date
    //===========================================================

    public async Task<FinalAccountsYearDto> GetYearAsync
    (
        string? date
    )
    {
        DateOnly day =
            ParseDate(date) ?? Today();

        var year =
            await YearOfAsync(day);

        return new FinalAccountsYearDto
        {
            Date = DateText(day),
            YearStart = year.HasValue ? DateText(year.Value.Start) : string.Empty,
            YearEnd = year.HasValue ? DateText(year.Value.End) : string.Empty
        };
    }


    //===========================================================
    // Profit & Loss
    //===========================================================

    public async Task<ProfitLossDto> GetProfitLossAsync
    (
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled,
        string? compare
    )
    {
        DateOnly end =
            ParseDate(to) ?? Today();

        DateOnly start =
            ParseDate(from)
            ?? (await YearOfAsync(end))?.Start
            ?? new DateOnly(end.Year, 1, 1);

        if (start > end)
        {
            (start, end) = (end, start);
        }

        TrialBalanceDto current =
            await _trialBalance.GetTrialBalanceAsync(
                userId,
                DateText(start),
                DateText(end),
                branchId,
                showCancelled);

        //=======================================================
        // Comparison period
        //=======================================================

        string mode =
            Clean(compare).ToLowerInvariant();

        DateOnly? compareStart = null;

        DateOnly? compareEnd = null;

        string compareLabel = string.Empty;

        if (mode == FinalAccountsCompare.LastYear)
        {
            compareStart = start.AddYears(-1);

            compareEnd = end.AddYears(-1);

            compareLabel = "Same period last year";
        }
        else if (mode == FinalAccountsCompare.Previous)
        {
            if (start.Day == 1 && IsLastDayOfMonth(end))
            {
                // Whole months : the same number of months before
                int months =
                    (end.Year - start.Year) * 12 + end.Month - start.Month + 1;

                DateOnly first =
                    start.AddMonths(-months);

                compareStart = first;

                compareEnd = start.AddDays(-1);
            }
            else
            {
                int days =
                    end.DayNumber - start.DayNumber + 1;

                compareEnd = start.AddDays(-1);

                compareStart = compareEnd.Value.AddDays(-(days - 1));
            }

            compareLabel = "Previous period";
        }
        else
        {
            mode = FinalAccountsCompare.None;
        }

        TrialBalanceDto? previous =
            compareStart.HasValue && compareEnd.HasValue
                ? await _trialBalance.GetTrialBalanceAsync(
                    userId,
                    DateText(compareStart.Value),
                    DateText(compareEnd.Value),
                    branchId,
                    showCancelled)
                : null;

        //=======================================================
        // Rows : income / expense ledgers, period Dr / Cr
        //=======================================================

        Dictionary<string, string> cogsLines =
            await CogsLinesAsync();

        List<FinalAccountsRowDto> rows =
            Merge(
                current,
                previous,
                row => row.IsNominal,
                ProfitLossSection,
                (row, section) =>
                    IsIncome(section)
                        ? row.Credit - row.Debit
                        : row.Debit - row.Credit);

        foreach (FinalAccountsRowDto row in rows)
        {
            if (row.Section == FinalAccountsSections.Sales)
            {
                row.Line =
                    LineOf(row.ClassName, row.GroupName, row.SubGroupName, row.LedgerName);
            }
            else if (row.Section == FinalAccountsSections.Cogs)
            {
                row.Line =
                    cogsLines.GetValueOrDefault(Clean(row.GroupCode))
                    ?? cogsLines.GetValueOrDefault(Clean(row.SubGroupCode))
                    ?? LineOf(row.GroupName, row.SubGroupName, row.LedgerName);
            }
        }

        // A period across two financial years : both added up
        var startYear =
            await YearOfAsync(start);

        var endYear =
            await YearOfAsync(end);

        bool acrossYears =
            startYear.HasValue
            && endYear.HasValue
            && startYear.Value.Start != endYear.Value.Start;

        ProfitLossDto result =
            new()
            {
                From = DateText(start),
                To = DateText(end),
                BranchId = branchId,
                BranchName = current.BranchName,
                ShowCancelled = showCancelled,
                Compare = mode,
                CompareFrom = compareStart.HasValue ? DateText(compareStart.Value) : string.Empty,
                CompareTo = compareEnd.HasValue ? DateText(compareEnd.Value) : string.Empty,
                CompareLabel = compareLabel,
                YearStart = current.YearStart,
                Message =
                    JoinMessages(
                        acrossYears
                            ? "The period runs across two financial years : the figures are the total of both."
                            : string.Empty),
                Totals = ProfitLossTotals(rows, x => x.Amount),
                CompareTotals = ProfitLossTotals(rows, x => x.CompareAmount),
                Rows = rows
            };

        return result;
    }


    private static ProfitLossTotalsDto ProfitLossTotals
    (
        List<FinalAccountsRowDto> rows,
        Func<FinalAccountsRowDto, decimal> value
    )
    {
        decimal Sum(string section) =>
            Money(rows.Where(x => x.Section == section).Sum(value));

        ProfitLossTotalsDto totals =
            new()
            {
                Sales = Sum(FinalAccountsSections.Sales),
                Cogs = Sum(FinalAccountsSections.Cogs),
                OtherIncome = Sum(FinalAccountsSections.OtherIncome),
                Expenses = Sum(FinalAccountsSections.Expense)
            };

        totals.GrossProfit =
            Money(totals.Sales - totals.Cogs);

        totals.NetProfit =
            Money(totals.GrossProfit + totals.OtherIncome - totals.Expenses);

        return totals;
    }


    //===========================================================
    // Balance Sheet
    //===========================================================

    public async Task<BalanceSheetDto> GetBalanceSheetAsync
    (
        long userId,
        string? asOn,
        long branchId,
        bool showCancelled,
        string? compare
    )
    {
        DateOnly date =
            ParseDate(asOn) ?? Today();

        TrialBalanceDto current =
            await _trialBalance.GetTrialBalanceAsync(
                userId,
                DateText(date),
                DateText(date),
                branchId,
                showCancelled);

        //=======================================================
        // Comparison date
        //=======================================================

        string mode =
            Clean(compare).ToLowerInvariant();

        DateOnly? compareDate = null;

        string compareLabel = string.Empty;

        string compareMessage = string.Empty;

        if (mode == FinalAccountsCompare.LastYear)
        {
            compareDate = date.AddYears(-1);

            compareLabel = "Same date last year";
        }
        else if (mode == FinalAccountsCompare.YearEnd)
        {
            var year =
                await YearOfAsync(date);

            if (year.HasValue)
            {
                compareDate = year.Value.Start.AddDays(-1);

                compareLabel = "End of the previous financial year";
            }
            else
            {
                mode = FinalAccountsCompare.None;

                compareMessage =
                    $"No financial year holds {DateText(date)} : the end of the previous year is not known, so there is no comparison (Settings > General Settings > Financial Years).";
            }
        }
        else
        {
            mode = FinalAccountsCompare.None;
        }

        TrialBalanceDto? previous =
            compareDate.HasValue
                ? await _trialBalance.GetTrialBalanceAsync(
                    userId,
                    DateText(compareDate.Value),
                    DateText(compareDate.Value),
                    branchId,
                    showCancelled)
                : null;

        //=======================================================
        // Rows : balance-sheet ledgers by their closing
        //=======================================================

        List<FinalAccountsRowDto> rows =
            Merge(
                current,
                previous,
                row => !row.IsNominal,
                BalanceSheetSection,
                (row, section) =>
                    section == FinalAccountsSections.Asset
                        ? row.Closing
                        : -row.Closing);

        BalanceSheetDto result =
            new()
            {
                AsOn = DateText(date),
                BranchId = branchId,
                BranchName = current.BranchName,
                ShowCancelled = showCancelled,
                Compare = mode,
                CompareAsOn = compareDate.HasValue ? DateText(compareDate.Value) : string.Empty,
                CompareLabel = compareLabel,
                YearStart = current.YearStart,
                RetainedEarningsCode = current.RetainedEarningsCode,
                RetainedEarningsName = current.RetainedEarningsName,
                PriorYearsResult = current.PriorYearsResult,
                Message = JoinMessages(current.Message, compareMessage),
                Totals = BalanceSheetTotals(rows, current, x => x.Amount),
                CompareTotals =
                    previous != null
                        ? BalanceSheetTotals(rows, previous, x => x.CompareAmount)
                        : new BalanceSheetTotalsDto(),
                Rows = rows
            };

        return result;
    }


    private static BalanceSheetTotalsDto BalanceSheetTotals
    (
        List<FinalAccountsRowDto> rows,
        TrialBalanceDto report,
        Func<FinalAccountsRowDto, decimal> value
    )
    {
        decimal Sum(string section) =>
            Money(rows.Where(x => x.Section == section).Sum(value));

        BalanceSheetTotalsDto totals =
            new()
            {
                Assets = Sum(FinalAccountsSections.Asset),
                Liabilities = Sum(FinalAccountsSections.Liability),
                Equity = Sum(FinalAccountsSections.Equity),

                // Income - expense not yet closed (credit = profit)
                ProfitToDate =
                    Money(-report.Rows.Where(x => x.IsNominal).Sum(x => x.Closing))
            };

        totals.LiabilitiesAndEquity =
            Money(totals.Liabilities + totals.Equity + totals.ProfitToDate);

        totals.Difference =
            Money(totals.Assets - totals.LiabilitiesAndEquity);

        return totals;
    }
}
