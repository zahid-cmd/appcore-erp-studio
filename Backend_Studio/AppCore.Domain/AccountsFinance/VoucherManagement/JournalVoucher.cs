//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Journal Voucher (header)
//
// JV-<branch digits>-<FY>-<MM>-<seq5>, e.g. JV-010101-2627-10-00001
// The number is taken when the draft is first saved (the page
// only shows a preview, nothing is reserved).
//
// Several groups per voucher; in each group :
//   n Debits : 1 Credit   or   1 Debit : n Credits
// and each group balances (debit = credit). Debits come first.
//
// Lines : JournalVoucherLines (Side Debit / Credit, GroupNo)
//   Supplier / Customer / General Ledger per row; cash / bank /
//   MFS / POS / EMI ledgers are not allowed (RV / PV / FT).
//
// Draft → Approved → Posted (→ Cancelled)
//   Draft     : editable / deletable, nothing posted
//   Approved  : locked (Return to Draft allowed)
//   Posted    : VoucherEntries written (checks wait for Check
//               Reconciliation, posted later as RRP)
//   Cancelled : reversing entries written
//===============================================================

public class JournalVoucher
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long JournalVoucherId { get; set; }


    //===========================================================
    // Voucher
    //===========================================================

    public string VoucherNo { get; set; } = string.Empty;

    public DateOnly VoucherDate { get; set; }

    // The branch the user logged in with
    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }


    //===========================================================
    // Summary
    //===========================================================

    // Supplier / Customer / General Ledger when every row uses
    // it, otherwise "Mixed"
    public string LedgerType { get; set; } = string.Empty;

    // Display : the first debited ledger ("+ n more" when
    // several rows)
    public string PartyName { get; set; } = string.Empty;

    // Detail narration
    public string Narration { get; set; } = string.Empty;


    //===========================================================
    // Totals
    //===========================================================

    // Sum of the debits (= sum of the credits)
    public decimal TotalAmount { get; set; }

    // Number of balanced groups
    public int GroupCount { get; set; }


    //===========================================================
    // Status
    //===========================================================

    // Draft / Approved / Posted / Cancelled
    public string Status { get; set; } = "Draft";

    public long? ApprovedBy { get; set; }

    public DateTime? ApprovedDate { get; set; }

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public DateOnly? CancelDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;


    //===========================================================
    // Soft Delete (drafts only)
    //===========================================================

    public bool IsDeleted { get; set; } = false;

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}