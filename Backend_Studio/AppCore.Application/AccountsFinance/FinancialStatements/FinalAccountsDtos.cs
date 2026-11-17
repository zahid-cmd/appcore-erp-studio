//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Final Accounts (Accounts & Finance › Financial Statements)
//
// Profit & Loss and Balance Sheet. Both read the Trial Balance
// engine (same ledgers, same branch rule, same cancelled rule),
// so the three reports never disagree.
//
// One row per ledger, with its section and its amount in the
// statement's own sign :
//   sales / other-income        Credit - Debit (income positive)
//   cogs / expense              Debit - Credit (cost positive)
//   asset                       closing Dr positive
//   liability / equity          closing Cr positive
// The page builds the Class › Group › Sub Group › Ledger tree.
//===============================================================

public static class FinalAccountsSections
{
    public const string Sales = "sales";

    public const string Cogs = "cogs";

    public const string OtherIncome = "other-income";

    public const string Expense = "expense";

    public const string Asset = "asset";

    public const string Liability = "liability";

    public const string Equity = "equity";
}


//===============================================================
// Comparison choices
//===============================================================

public static class FinalAccountsCompare
{
    public const string None = "none";

    // Profit & Loss : the same dates one year earlier;
    // Balance Sheet : the same date one year earlier
    public const string LastYear = "last-year";

    // Profit & Loss : the period of the same length just before
    // (whole months stay whole months)
    public const string Previous = "previous";

    // Balance Sheet : the last day of the previous financial year
    public const string YearEnd = "year-end";
}


public class FinalAccountsRowDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // General Ledger / Cash / Bank / MFS / POS / EMI ...
    public string LedgerType { get; set; } = string.Empty;

    public string ClassCode { get; set; } = string.Empty;

    public string ClassName { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public bool IsRetainedEarnings { get; set; }

    // Balance Sheet : the ledger's Account Group is non-current
    // (asset / liability only; Account Group setting)
    public bool IsNonCurrent { get; set; }

    // The setting : MB / SP / AC / SV / "" (the ledger's own, else the
    // one of its Account Class)
    public string BusinessLine { get; set; } = string.Empty;

    // FinalAccountsSections
    public string Section { get; set; } = string.Empty;

    // Business line : mb / sp / ac / service / "" (Profit & Loss
    // sales and cost of goods sold only)
    public string Line { get; set; } = string.Empty;

    // This period / date
    public decimal Amount { get; set; }

    // Comparison period / date (0 when there is none)
    public decimal CompareAmount { get; set; }
}


//===============================================================
// Profit & Loss
//===============================================================

public class ProfitLossTotalsDto
{
    public decimal Sales { get; set; }

    public decimal Cogs { get; set; }

    // Sales - Cogs
    public decimal GrossProfit { get; set; }

    public decimal OtherIncome { get; set; }

    public decimal Expenses { get; set; }

    // GrossProfit + OtherIncome - Expenses (negative = loss)
    public decimal NetProfit { get; set; }
}


public class ProfitLossDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    // 0 = all branches the user is allotted to
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    // FinalAccountsCompare (none when no comparison)
    public string Compare { get; set; } = FinalAccountsCompare.None;

    public string CompareFrom { get; set; } = string.Empty;

    public string CompareTo { get; set; } = string.Empty;

    // Column title, e.g. "Same period last year"
    public string CompareLabel { get; set; } = string.Empty;

    // Start of the financial year that holds From ("" = none)
    public string YearStart { get; set; } = string.Empty;

    // A warning shown over the report ("" = none)
    public string Message { get; set; } = string.Empty;

    public ProfitLossTotalsDto Totals { get; set; } = new();

    public ProfitLossTotalsDto CompareTotals { get; set; } = new();

    public List<FinalAccountsRowDto> Rows { get; set; } = new();
}


//===============================================================
// Balance Sheet
//===============================================================

public class BalanceSheetTotalsDto
{
    public decimal Assets { get; set; }

    public decimal Liabilities { get; set; }

    // Equity ledgers (Retained Earnings includes the earlier
    // years' result)
    public decimal Equity { get; set; }

    // Income - expense from the year start to the date (not yet
    // closed into Retained Earnings)
    public decimal ProfitToDate { get; set; }

    // Liabilities + Equity + ProfitToDate
    public decimal LiabilitiesAndEquity { get; set; }

    // Assets - LiabilitiesAndEquity (0 = balanced; equals the
    // Trial Balance difference)
    public decimal Difference { get; set; }
}


public class BalanceSheetDto
{
    public string AsOn { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public string Compare { get; set; } = FinalAccountsCompare.None;

    public string CompareAsOn { get; set; } = string.Empty;

    public string CompareLabel { get; set; } = string.Empty;

    // Start of the financial year that holds AsOn ("" = none) :
    // the profit to date counts from here
    public string YearStart { get; set; } = string.Empty;

    public string RetainedEarningsCode { get; set; } = string.Empty;

    public string RetainedEarningsName { get; set; } = string.Empty;

    // Earlier years' result inside Retained Earnings (signed;
    // credit = profit), as in the Trial Balance
    public decimal PriorYearsResult { get; set; }

    public string Message { get; set; } = string.Empty;

    public BalanceSheetTotalsDto Totals { get; set; } = new();

    public BalanceSheetTotalsDto CompareTotals { get; set; } = new();

    public List<FinalAccountsRowDto> Rows { get; set; } = new();
}


//===============================================================
// Financial year of a date (filter defaults)
//===============================================================

public class FinalAccountsYearDto
{
    public string Date { get; set; } = string.Empty;

    // "" when no financial year holds the date
    public string YearStart { get; set; } = string.Empty;

    public string YearEnd { get; set; } = string.Empty;
}


//===============================================================
// Return on Investment : the figures the page works the ratios
// from (ROI, ROCE, ROE, ROA, GMROI by business line). Averages,
// ratios and the annualised rates are worked out on the page.
//===============================================================

// The investment on one date (Balance Sheet)
public class RoiBaseDto
{
    public string Date { get; set; } = string.Empty;

    // Equity + profit / loss for the year to date
    public decimal Equity { get; set; }

    public decimal NonCurrentLiabilities { get; set; }

    public decimal CurrentLiabilities { get; set; }

    public decimal TotalAssets { get; set; }

    // Equity + Non-current Liabilities (= Net Assets)
    public decimal CapitalEmployed { get; set; }
}

// One business line : gross profit of the period and its stock
// (inventory / work in progress groups of its product categories)
public class RoiLineDto
{
    // mb / sp / ac / service
    public string Line { get; set; } = string.Empty;

    public decimal Sales { get; set; }

    public decimal GrossProfit { get; set; }

    public decimal OpeningStock { get; set; }

    public decimal ClosingStock { get; set; }
}

// One period (this period or the same period last year)
public class RoiFiguresDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public decimal NetProfit { get; set; }

    // Expense ledgers under the sub groups marked Finance cost
    public decimal FinanceCosts { get; set; }

    public decimal ProfitBeforeInterest { get; set; }

    // The day before From
    public RoiBaseDto Opening { get; set; } = new();

    public RoiBaseDto Closing { get; set; } = new();

    public List<RoiLineDto> Lines { get; set; } = new();
}

public class ReturnOnInvestmentDto
{
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    // none / last-year
    public string Compare { get; set; } = FinalAccountsCompare.None;

    public string CompareLabel { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    // "SUB-004-001-001 Financial Expenses" ... (empty : none
    // marked, profit before interest = net profit)
    public List<string> FinanceSubGroups { get; set; } = new();

    public RoiFiguresDto Current { get; set; } = new();

    public RoiFiguresDto? Previous { get; set; }
}
