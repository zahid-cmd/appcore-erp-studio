//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.AccountingRegisters;


//===============================================================
// Ledger Statements and Registers (Cash / Bank / MFS / POS /
// EMI) : read-only statements from VoucherEntries.
//
// Type : General Ledger / Cash / Bank / MFS / POS / EMI
// Dates are yyyy-MM-dd. BranchId 0 = all branches.
// Amounts : Debit − Credit is positive Dr, negative Cr.
//===============================================================


//===============================================================
// Chart : the filter lists of one type (only the classes,
// groups and sub groups that hold ledgers of the type)
//===============================================================

public class LedgerChartDto
{
    public string Type { get; set; } = string.Empty;

    public List<LedgerChartNodeDto> Classes { get; set; } = new();

    public List<LedgerChartNodeDto> Groups { get; set; } = new();

    public List<LedgerChartNodeDto> SubGroups { get; set; } = new();

    public List<LedgerChartLedgerDto> Ledgers { get; set; } = new();

    public List<LedgerOptionDto> Branches { get; set; } = new();
}


public class LedgerChartNodeDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Group : its class; sub group : its group
    public string ParentCode { get; set; } = string.Empty;

    public string ClassCode { get; set; } = string.Empty;
}


public class LedgerChartLedgerDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string ClassCode { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    // Normal side : Dr / Cr
    public string Mode { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class LedgerOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}


//===============================================================
// Statement of one ledger
//===============================================================

public class LedgerStatementDto
{
    public string Type { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string ClassName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Normal side : Dr / Cr
    public string Mode { get; set; } = string.Empty;

    // Income / expense : opening counts from the FY start
    public bool IsNominal { get; set; }

    public string OpeningFrom { get; set; } = string.Empty;

    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public decimal Opening { get; set; }

    public decimal TotalDebit { get; set; }

    public decimal TotalCredit { get; set; }

    public decimal Closing { get; set; }

    // Rows past the limit were left out (totals are complete)
    public bool Truncated { get; set; }

    public List<LedgerStatementRowDto> Rows { get; set; } = new();
}


public class LedgerStatementRowDto
{
    public string VoucherType { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public string VoucherDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    // Reversing line of a cancelled voucher
    public bool IsReversal { get; set; }

    // Original line of a voucher that was cancelled
    public bool IsCancelled { get; set; }

    // Contra ledger(s) of the line ("A", "A, B", "A +2 more")
    public string Particulars { get; set; } = string.Empty;

    // Their codes, same form ("GLR-…", "GLR-…, GLR-…", …)
    public string ContraCodes { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    // Cheque no / transaction id / reference
    public string Reference { get; set; } = string.Empty;

    // Bank cheques : Pending / Deposited / Cleared / Dishonoured
    public string Status { get; set; } = string.Empty;

    // Voucher narration (the same on every line of the voucher)
    public string Narration { get; set; } = string.Empty;

    // This line's own narration when it differs from the
    // voucher's
    public string ShortNote { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    // Running balance after the row (Debit − Credit)
    public decimal Balance { get; set; }
}


//===============================================================
// Summary : one row per ledger of a class / group / sub group
//===============================================================

public class LedgerSummaryDto
{
    public string Type { get; set; } = string.Empty;

    public string ClassCode { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    // "Assets › Current Assets › Cash in Hand" / "All ledgers"
    public string ScopePath { get; set; } = string.Empty;

    public string From { get; set; } = string.Empty;

    public string To { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public bool ShowCancelled { get; set; }

    public decimal Opening { get; set; }

    public decimal TotalDebit { get; set; }

    public decimal TotalCredit { get; set; }

    public decimal Closing { get; set; }

    public List<LedgerSummaryRowDto> Rows { get; set; } = new();
}


public class LedgerSummaryRowDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string Mode { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public decimal Opening { get; set; }

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public decimal Closing { get; set; }
}


//===============================================================
// One voucher (opened inline under its statement row)
//===============================================================

public class LedgerVoucherDto
{
    public string VoucherType { get; set; } = string.Empty;

    public string VoucherNo { get; set; } = string.Empty;

    public string VoucherDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public List<LedgerVoucherLineDto> Lines { get; set; } = new();

    public bool IsReversed { get; set; }

    public string ReversalDate { get; set; } = string.Empty;

    public string ReversalReason { get; set; } = string.Empty;

    public List<LedgerVoucherLineDto> ReversalLines { get; set; } = new();
}


public class LedgerVoucherLineDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string PartyName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }
}
