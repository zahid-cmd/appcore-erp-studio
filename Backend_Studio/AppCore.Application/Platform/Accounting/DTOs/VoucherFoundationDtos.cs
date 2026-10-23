//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Accounting;


//===============================================================
// Voucher Period
//
// Branch + financial year that a voucher date falls in.
//===============================================================

public class VoucherPeriodDto
{
    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    // BRN-01-01-01 → 010101
    public string BranchDigits { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    // FY 2026-2027
    public string FinancialYearName { get; set; } = string.Empty;

    // 2627
    public string FinancialYearCode { get; set; } = string.Empty;

    // Calendar month 1 - 12
    public int PeriodMonth { get; set; }

    public DateOnly VoucherDate { get; set; }
}


//===============================================================
// Voucher Number (result of taking the next number)
//===============================================================

public class VoucherNumberDto : VoucherPeriodDto
{
    public string Prefix { get; set; } = string.Empty;

    public int Sequence { get; set; }

    // RV-010101-2627-10-00001
    public string VoucherNo { get; set; } = string.Empty;
}


//===============================================================
// Voucher Ledger (lookup row for Master Entry / Payment Desk)
//===============================================================

public class VoucherLedgerDto
{
    // Row id in its own table (GeneralLedgerId, CashAccountId,
    // BankAccountId, MFSAccountId, POSAccountId, EmiAccountId)
    public long AccountId { get; set; }

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // General Ledger / Cash / Bank / MFS / POS / EMI
    public string LedgerType { get; set; } = string.Empty;

    public string ClassCode { get; set; } = string.Empty;

    public string GroupCode { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    // Cash / Bank / MFS / POS / EMI only (empty for GL)
    public string Branch { get; set; } = string.Empty;

    public bool BranchExclusive { get; set; }

    public bool CollectionAccount { get; set; }

    public bool PaymentAccount { get; set; }

    // Money ledger : Cash / Bank / MFS / POS / EMI
    public bool IsMoneyLedger { get; set; }

    // MFS : the account's MFS Charges %; 0 for the others
    // (card charges come from Card Charges per POS + card)
    public decimal ChargePercent { get; set; }

    public bool IsActive { get; set; }
}


//===============================================================
// Voucher Posting Request
//===============================================================

public class VoucherPostingRequest
{
    // RV / PV / JV / FT / RRV / RRP
    public string VoucherType { get; set; } = string.Empty;

    // Header row id in the voucher's own table
    public long VoucherId { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public DateOnly VoucherDate { get; set; }

    public long BranchId { get; set; }

    public string PartyType { get; set; } = string.Empty;

    public string PartyCode { get; set; } = string.Empty;

    public string ReferenceNo { get; set; } = string.Empty;

    // Used for lines without their own narration
    public string Narration { get; set; } = string.Empty;

    public List<VoucherPostingLine> Lines { get; set; } = new();
}


public class VoucherPostingLine
{
    // Journal group; 1 for RV / PV / FT
    public int GroupNo { get; set; } = 1;

    public string LedgerCode { get; set; } = string.Empty;

    public decimal Debit { get; set; }

    public decimal Credit { get; set; }

    public string Narration { get; set; } = string.Empty;

    // Party of this line (e.g. each customer of a 1 : n receipt).
    // Empty : the request's PartyType / PartyCode are used.
    public string PartyType { get; set; } = string.Empty;

    public string PartyCode { get; set; } = string.Empty;
}