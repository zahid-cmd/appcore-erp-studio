//===============================================================
// Imports
//===============================================================

import
{
    VoucherDebitLine
}
from '../../../../shared/components/accounting/accounting.models';


//===============================================================
// Bookings (Sales Operations > Booking Management > Bookings)
//
// A booking holds the customer, model and colour; its advance is
// collected by Receipt Vouchers to the customer's own ledger and
// taken as paid by the Sales Invoice - MB. Open -> Converted /
// Cancelled; Expired = Open past Valid Until (shown only).
//===============================================================

export type BookingStatus =
    'Open' | 'Converted' | 'Cancelled';

export interface Booking
{
    BookingId:
        number;
    PublicId:
        string;
    BookingNo:
        string;
    // yyyy-MM-dd
    BookingDate:
        string;
    BranchId:
        number;
    BranchName:
        string;
    CustomerId:
        number;
    CustomerCode:
        string;
    CustomerName:
        string;
    CustomerPhone:
        string;
    MotorBikeId:
        number;
    ModelName:
        string;
    ValidUntil:
        string;
    ExpectedDate:
        string;
    SalesPersonName:
        string;
    Remarks:
        string;
    AdvanceAmount:
        number;
    Status:
        BookingStatus;
    IsExpired:
        boolean;
    SalesInvoiceNo:
        string;
    ConvertedDate:
        string;
    // A draft / approved invoice holds it
    HeldByInvoiceNo:
        string;
    CancelReason:
        string;
    CancelledDate:
        string;
    ForfeitAmount:
        number;
    ForfeitVoucherNo:
        string;
    RefundAmount:
        number;
    CollectionCount:
        number;
}

export interface BookingCollection
{
    BookingCollectionId:
        number;
    PublicId:
        string;
    BookingId:
        number;
    BookingNo:
        string;
    CustomerName:
        string;
    ModelName:
        string;
    BranchId:
        number;
    CollectionDate:
        string;
    Amount:
        number;
    ReceiptVoucherNo:
        string;
    Remarks:
        string;
}

export interface BookingModel
{
    MotorBikeId:
        number;
    ProductCode:
        string;
    ProductName:
        string;
}

export interface BookingSwitches
{
    // null = no minimum / no expiry
    MinimumAmount:
        number | null;
    ValidityDays:
        number | null;
    RefundOnCancel:
        boolean;
    ForfeitPercent:
        number;
}

export interface BookingsPage
{
    Today:
        string;
    BranchId:
        number;
    BranchName:
        string;
    Switches:
        BookingSwitches;
    CanCancel:
        boolean;
    Bookings:
        Booking[];
    Collections:
        BookingCollection[];
    Models:
        BookingModel[];
}

export interface BookingCustomer
{
    CustomerId:
        number;
    CustomerCode:
        string;
    CustomerName:
        string;
    Phone1:
        string;
    CustomerType:
        string;
    IsWalkIn:
        boolean;
}

export interface CreateBooking
{
    Date:
        string;
    CustomerId:
        number;
    MotorBikeId:
        number;
    ExpectedDate:
        string;
    SalesPersonName:
        string;
    Remarks:
        string;
    Debits:
        VoucherDebitLine[];
}

export interface UpdateBooking
{
    MotorBikeId:
        number;
    ExpectedDate:
        string;
    SalesPersonName:
        string;
    Remarks:
        string;
}

export interface BookingSaved
{
    PublicId:
        string;
    BookingNo:
        string;
    ReceiptVoucherNo:
        string;
    ForfeitVoucherNo:
        string;
}

// Open bookings of a customer (Sales Invoice - MB)
export interface OpenBooking
{
    BookingId:
        number;
    BookingNo:
        string;
    BookingDate:
        string;
    MotorBikeId:
        number;
    ModelName:
        string;
    AdvanceAmount:
        number;
    IsExpired:
        boolean;
    ValidUntil:
        string;
    HeldByInvoiceNo:
        string;
}
