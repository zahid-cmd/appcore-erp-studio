//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.BookingManagement;


//===============================================================
// Bookings (Sales Operations > Booking Management > Bookings;
// hand-written page, NO Code Synchronization; tables made by
// BookingsMB_Engine.sql).
//
// A booking holds the customer, model and colour (no chassis, no
// price lock). Its advance is collected by Receipt Vouchers to
// the customer's own ledger; the Sales Invoice - MB takes it as
// already paid. Status : Open -> Converted (posted invoice) /
// Cancelled (reason; forfeit by Journal Voucher, the rest stays
// on the customer's ledger to refund). Expired = Open past
// ValidUntil (shown only).
//===============================================================

public class Bookings
{
    public long BookingId { get; set; }

    public Guid PublicId { get; set; }

    // BKMB-<branch>-<FY>-<MM>-<seq>
    public string BookingNo { get; set; } = string.Empty;

    public DateOnly BookingDate { get; set; }

    public long BranchId { get; set; }

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    // Model + colour (MotorBikes)
    public long MotorBikeId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public DateOnly? ValidUntil { get; set; }

    public DateOnly? ExpectedDate { get; set; }

    public string SalesPersonName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Sum of the collections
    public decimal AdvanceAmount { get; set; }

    // Open / Converted / Cancelled
    public string Status { get; set; } = "Open";

    public long? SalesInvoiceId { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public DateOnly? ConvertedDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public decimal ForfeitAmount { get; set; }

    public long? ForfeitVoucherId { get; set; }

    public string ForfeitVoucherNo { get; set; } = string.Empty;

    // Left on the customer's ledger to refund
    public decimal RefundAmount { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// One collection of a booking (its Receipt Voucher)
//===============================================================

public class BookingCollections
{
    public long BookingCollectionId { get; set; }

    public Guid PublicId { get; set; }

    public long BookingId { get; set; }

    public DateOnly CollectionDate { get; set; }

    public decimal Amount { get; set; }

    public long? ReceiptVoucherId { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}
