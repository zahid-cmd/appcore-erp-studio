//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Fund Transfer Lines
//
// Side        : From (credit) / To (debit)
// AccountType : Cash / Bank / MFS
// From rows   : Method Cash / Bank Transfer / Cheque / MFS,
//               Reference (transfer ref / MFS txn id), Cheque No /
//               Date, ChargeAmount (company bears; Bank / MFS)
// LineNo      : 1, 2, ... (From rows first, then To rows)
//===============================================================

public class FundTransferLines
{
    public long FundTransferLineId { get; set; }

    public long FundTransferId { get; set; }

    public int LineNo { get; set; }

    // From / To
    public string Side { get; set; } = string.Empty;

    // Cash / Bank / MFS
    public string AccountType { get; set; } = string.Empty;

    public string SubGroupCode { get; set; } = string.Empty;

    public string SubGroupName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    // Row id in the account's own table (CashAccountId,
    // BankAccountId, MFSAccountId)
    public long AccountId { get; set; }

    // Branch of the account (inter-branch transfers)
    public string AccountBranch { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string ShortNotes { get; set; } = string.Empty;

    // From rows : Cash / Bank Transfer / Cheque / MFS
    public string Method { get; set; } = string.Empty;

    // Bank transfer reference / MFS transaction id
    public string Reference { get; set; } = string.Empty;

    public string CheckNo { get; set; } = string.Empty;

    public DateOnly? CheckDate { get; set; }

    // Charge the company pays on top (From Bank / MFS rows)
    public decimal ChargeAmount { get; set; }
}