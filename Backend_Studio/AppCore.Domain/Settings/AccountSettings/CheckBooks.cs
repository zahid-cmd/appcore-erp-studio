//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Check Books (Settings > Account Settings, hand-written page :
// NEVER run Code Sync for it; tables made by
// CheckBooks_Engine.sql)
//
//   CheckBooks       CB-0001  a check book of one of our bank
//                             accounts : a range of leaves
//   CheckBookLeaves           one row per leaf and its status
//===============================================================

public class CheckBooks
{
    public long CheckBookId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long BankAccountId { get; set; }

    // The bank's own number of the book (optional)
    public string BookNo { get; set; } = string.Empty;

    // Printed before the number (optional), e.g. "CA"
    public string Prefix { get; set; } = string.Empty;

    public long StartNo { get; set; }

    public long EndNo { get; set; }

    // Digits of the number as typed (leading zeros kept), 0 = none
    public int NumberWidth { get; set; }

    public int LeafCount { get; set; }

    public DateOnly ReceivedDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class CheckBookLeaves
{
    public long CheckBookLeafId { get; set; }

    public long CheckBookId { get; set; }

    // Copied from the book : the vouchers look leaves up by account
    public long BankAccountId { get; set; }

    public long LeafNo { get; set; }

    // Prefix + the number padded to the book's width
    public string CheckNo { get; set; } = string.Empty;

    // Unused / Issued / Cancelled / Lost / Void
    public string Status { get; set; } = "Unused";

    // PV / FT ('' = none)
    public string SourceType { get; set; } = string.Empty;

    public long? SourceId { get; set; }

    public string SourceNo { get; set; } = string.Empty;

    public string PayeeName { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public DateOnly? IssuedDate { get; set; }

    // Why it was cancelled / lost / voided
    public string Reason { get; set; } = string.Empty;

    public long? StatusBy { get; set; }

    public DateTime? StatusDate { get; set; }
}


//===============================================================
// Cheque print layout of one of our bank accounts (2026-11-15) :
// where each field sits on the real leaf, in mm. The layout is a
// JSON text the page owns (leaf size, printer offset, date boxes,
// payee, amount in words / figures, A/C Payee crossing,
// counterfoil). Table made by CheckPrintLayouts_Engine.sql.
//===============================================================

public class CheckPrintLayouts
{
    public long CheckPrintLayoutId { get; set; }

    public long BankAccountId { get; set; }

    public string LayoutJson { get; set; } = "{}";

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
