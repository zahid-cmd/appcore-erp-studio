//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.BookingManagement;


//===============================================================
// Bookings (motor bikes) : page data
//===============================================================

public class BookingRowDto
{
    public long BookingId { get; set; }

    public Guid PublicId { get; set; }

    public string BookingNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string BookingDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public string CustomerCode { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public long MotorBikeId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string ValidUntil { get; set; } = string.Empty;

    public string ExpectedDate { get; set; } = string.Empty;

    public string SalesPersonName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public decimal AdvanceAmount { get; set; }

    // Open / Converted / Cancelled (as stored)
    public string Status { get; set; } = string.Empty;

    // Open past ValidUntil
    public bool IsExpired { get; set; }

    public string SalesInvoiceNo { get; set; } = string.Empty;

    public string ConvertedDate { get; set; } = string.Empty;

    // A draft / approved invoice holds it (no collection / cancel)
    public string HeldByInvoiceNo { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public decimal ForfeitAmount { get; set; }

    public string ForfeitVoucherNo { get; set; } = string.Empty;

    public decimal RefundAmount { get; set; }

    public int CollectionCount { get; set; }
}


public class BookingCollectionRowDto
{
    public long BookingCollectionId { get; set; }

    public Guid PublicId { get; set; }

    public long BookingId { get; set; }

    public string BookingNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string CollectionDate { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    public Guid? ReceiptVoucherPublicId { get; set; }

    public string Remarks { get; set; } = string.Empty;
}


public class BookingModelDto
{
    public long MotorBikeId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;
}


// Booking switches (CFG-MOD-008-0091 .. 0094)
public class BookingSwitchesDto
{
    // null = no minimum
    public decimal? MinimumAmount { get; set; }

    // null = no expiry
    public int? ValidityDays { get; set; }

    public bool RefundOnCancel { get; set; } = true;

    // 0 = none suggested
    public decimal ForfeitPercent { get; set; }
}


public class BookingsPageDto
{
    public string Today { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public BookingSwitchesDto Switches { get; set; } = new();

    public bool CanCancel { get; set; }

    public List<BookingRowDto> Bookings { get; set; } = new();

    public List<BookingCollectionRowDto> Collections { get; set; } = new();

    public List<BookingModelDto> Models { get; set; } = new();
}


//===============================================================
// Input
//===============================================================

// New booking : details + the first collection (Payment Desk rows)
public class CreateBookingDto
{
    // yyyy-MM-dd ('' = today)
    public string Date { get; set; } = string.Empty;

    public long CustomerId { get; set; }

    public long MotorBikeId { get; set; }

    public string ExpectedDate { get; set; } = string.Empty;

    public string SalesPersonName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<ReceiptVoucherDebitDto> Debits { get; set; } = new();
}


// Details of an open booking (model, dates, notes)
public class UpdateBookingDto
{
    public long MotorBikeId { get; set; }

    public string ExpectedDate { get; set; } = string.Empty;

    public string SalesPersonName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}


// More advance on an open booking
public class CollectBookingDto
{
    public string Date { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<ReceiptVoucherDebitDto> Debits { get; set; } = new();
}


public class CancelBookingDto
{
    public string Reason { get; set; } = string.Empty;

    // Kept as income (0 .. advance); the rest stays on the
    // customer's ledger to refund. Refund on Cancel OFF : the
    // whole advance.
    public decimal ForfeitAmount { get; set; }
}


public class BookingSavedDto
{
    public Guid PublicId { get; set; }

    public string BookingNo { get; set; } = string.Empty;

    public string ReceiptVoucherNo { get; set; } = string.Empty;

    public Guid? ReceiptVoucherPublicId { get; set; }

    public string ForfeitVoucherNo { get; set; } = string.Empty;
}


// Open bookings of a customer (the Sales Invoice - MB picks one)
public class OpenBookingDto
{
    public long BookingId { get; set; }

    public string BookingNo { get; set; } = string.Empty;

    public string BookingDate { get; set; } = string.Empty;

    public long MotorBikeId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public decimal AdvanceAmount { get; set; }

    public bool IsExpired { get; set; }

    public string ValidUntil { get; set; } = string.Empty;

    // Held by another draft / approved invoice
    public string HeldByInvoiceNo { get; set; } = string.Empty;
}
