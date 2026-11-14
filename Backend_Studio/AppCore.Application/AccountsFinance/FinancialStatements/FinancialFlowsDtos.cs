//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.FinancialStatements;


//===============================================================
// Financial flows (Accounts & Finance › Financial Statements)
//
//   Cash flows : one engine for the Receipt & Payment Account and
//   the Cash Flow Statement (direct method).
//   Changes in Equity.
//
// Cash and cash equivalents : every Cash, Bank, MFS, POS and EMI
// ledger (POS / EMI count on the sale day : owner, 2026-11-14).
//===============================================================

public static class FinancialFlowActivities
{
    public const string Operating = "operating";

    public const string Investing = "investing";

    public const string Financing = "financing";
}


//===============================================================
// Cash flows
//===============================================================

// One cash / bank / MFS / POS / EMI ledger : balance before From,
// money in / out in the period (transfers included), balance at To
public class CashLedgerDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // Cash / Bank / MFS / POS / EMI
    public string LedgerType { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public decimal Opening { get; set; }

    public decimal Received { get; set; }

    public decimal Paid { get; set; }

    public decimal Closing { get; set; }
}


// One contra ledger (where the money came from / went to)
public class CashFlowRowDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string LedgerType { get; set; } = string.Empty;

    public string ClassCode { get; set; } = string.Empty;

    public string ClassName { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // FinancialFlowActivities
    public string Activity { get; set; } = FinancialFlowActivities.Operating;

    // Money received from this ledger (positive)
    public decimal Received { get; set; }

    // Money paid to this ledger (positive)
    public decimal Paid { get; set; }

    // Vouchers that moved money against it
    public int Vouchers { get; set; }
}


public class CashFlowsDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    // 0 = all branches the user is allotted to
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public string Message { get; set; } = string.Empty;

    public List<CashLedgerDto> CashLedgers { get; set; } = new();

    public List<CashFlowRowDto> Rows { get; set; } = new();

    // Money moved between two cash / bank / MFS / POS / EMI
    // ledgers (fund transfers, deposits, settlements); in = out
    public decimal Transfers { get; set; }

    public decimal Opening { get; set; }

    // Σ Rows.Received / Σ Rows.Paid (transfers not included)
    public decimal Receipts { get; set; }

    public decimal Payments { get; set; }

    public decimal Closing { get; set; }

    // Opening + Receipts - Payments - Closing (0 = every taka
    // traced to a contra ledger)
    public decimal Difference { get; set; }
}


//===============================================================
// Changes in Equity
//===============================================================

// One equity ledger; amounts on the credit side (positive =
// equity)
public class EquityLedgerDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public bool IsRetainedEarnings { get; set; }

    // Balance at From (Retained Earnings : includes the earlier
    // years and the profit / loss of this year before From)
    public decimal Opening { get; set; }

    // Profit / loss for the period (Retained Earnings only)
    public decimal Profit { get; set; }

    // Credits in the period (capital introduced, additions)
    public decimal Added { get; set; }

    // Debits in the period (drawings, withdrawals), positive
    public decimal Withdrawn { get; set; }

    // Opening + Profit + Added - Withdrawn
    public decimal Closing { get; set; }
}


public class ChangesInEquityDto
{
    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public string YearStart { get; set; } = string.Empty;

    public string RetainedEarningsCode { get; set; } = string.Empty;

    public string RetainedEarningsName { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public List<EquityLedgerDto> Ledgers { get; set; } = new();

    public decimal Opening { get; set; }

    public decimal Profit { get; set; }

    public decimal Added { get; set; }

    public decimal Withdrawn { get; set; }

    public decimal Closing { get; set; }

    // Equity + profit to date on the Balance Sheet at To
    public decimal BalanceSheetEquity { get; set; }

    // Closing - BalanceSheetEquity (0 = agrees)
    public decimal Difference { get; set; }
}
