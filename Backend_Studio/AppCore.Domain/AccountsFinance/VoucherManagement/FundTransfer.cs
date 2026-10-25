//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Fund Transfer (header)
//
// FT-<branch digits>-<FY>-<MM>-<seq5>, e.g. FT-010101-2627-10-00001
// The number is taken when the draft is first saved (the page
// only shows a preview, nothing is reserved).
//
// Money moved between our own Cash / Bank / MFS accounts (same
// branch or another branch), posted at once :
//   From (CREDIT, entered first) → To (DEBIT)
//   n From : 1 To   or   1 From : n To   (switch 0023 OFF : one
//   From and one To)
// Lines : FundTransferLines (Side From / To, method, reference,
// cheque, charge). A Bank / MFS charge the company pays is
// posted to Bank Charges / MFS Charges.
//
// Draft → Approved → Posted (→ Cancelled)
//   Draft     : editable / deletable, nothing posted
//   Approved  : locked (Return to Draft allowed)
//   Posted    : VoucherEntries written (checks wait for Check
//               Reconciliation, posted later as RRP)
//   Cancelled : reversing entries written
//===============================================================

public class FundTransfer
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long FundTransferId { get; set; }


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

    // "Cash to Bank", "Bank to Cash", "Bank to Bank" ... (types of
    // the From / To accounts)
    public string TransferType { get; set; } = string.Empty;

    // Display : "From account → To account" ("+ n more")
    public string PartyName { get; set; } = string.Empty;

    // Detail narration
    public string Narration { get; set; } = string.Empty;


    //===========================================================
    // Totals
    //===========================================================

    // Sum of the debits (= sum of the credits)
    public decimal TotalAmount { get; set; }

    // Bank / MFS charges the company pays on top (Dr charge
    // expense, Cr the From account)
    public decimal Charges { get; set; }


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