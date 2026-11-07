//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Trial Balance (Accounts & Finance › Financial Statements)
//
// One row per ledger. Amounts are signed : positive = Dr,
// negative = Cr. The page builds the Class › Group › Sub Group
// tree and the Dr / Cr columns from the rows.
//===============================================================

public class TrialBalanceDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    // 0 = all branches the user is allotted to
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    // Start of the financial year that holds From ("" = none) :
    // income / expense ledgers count from here
    public string YearStart { get; set; } = string.Empty;

    // Retained Earnings (Posting Setup RETAINED-EARNINGS)
    public string RetainedEarningsCode { get; set; } = string.Empty;

    public string RetainedEarningsName { get; set; } = string.Empty;

    // Net income / expense of the earlier financial years
    // (signed; credit = profit) added to its opening
    public decimal PriorYearsResult { get; set; }

    // A warning shown over the report ("" = none)
    public string Message { get; set; } = string.Empty;

    // Totals of every ledger (Dr side / Cr side, each positive)
    public decimal OpeningDebit { get; set; }

    public decimal OpeningCredit { get; set; }

    public decimal PeriodDebit { get; set; }

    public decimal PeriodCredit { get; set; }

    public decimal ClosingDebit { get; set; }

    public decimal ClosingCredit { get; set; }

    // ClosingDebit - ClosingCredit (0 = balanced)
    public decimal Difference { get; set; }

    public List<TrialBalanceRowDto> Rows { get; set; } = new();
}


public class TrialBalanceRowDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // General Ledger / Cash / Bank / MFS / POS / EMI
    public string LedgerType { get; set; } = string.Empty;

    public string ClassCode { get; set; } = string.Empty;

    public string ClassName { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Normal side : Dr / Cr
    public string Mode { get; set; } = "Dr";

    // Income / expense ledger (opening from the year start)
    public bool IsNominal { get; set; }

    public bool IsActive { get; set; }

    // The Retained Earnings ledger (its opening holds the
    // earlier years' result)
    public bool IsRetainedEarnings { get; set; }

    // Posted on or before To (any date)
    public bool HasEntries { get; set; }

    public decimal Opening { get; set; }

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public decimal Closing { get; set; }
}


public class TrialBalanceBranchDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}
