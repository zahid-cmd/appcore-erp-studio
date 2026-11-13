//===============================================================
// Imports
//===============================================================

import
{
    VoucherDebitLine
}
from '../../../../shared/components/accounting/accounting.models';


//===============================================================
// Bookings (Sales Operations > Booking Management > Bookings -
// MB / SP / AC; one page per type)
//
// MB : the customer, model and colour. SP / AC : the items with
// quantity. The advance is collected by Receipt Vouchers to the
// customer's own ledger and taken as paid by the Sales Invoice of
// the same type. Open -> Converted / Cancelled; Expired = Open
// past Valid Until (shown only). No price lock.
//===============================================================

export type BookingStatus =
    'Open' | 'Converted' | 'Cancelled';

export type BookingType =
    'MB' | 'SP' | 'AC';

// SP / AC : one item booked
export interface BookingLine
{
    ProductId:
        number;
    ProductCode:
        string;
    PartNumber:
        string;
    ProductName:
        string;
    Unit:
        string;
    Quantity:
        number;
    Remarks:
        string;
}

// SP / AC : a product found by the item search
export interface BookingProduct
{
    ProductId:
        number;
    ProductCode:
        string;
    PartNumber:
        string;
    ProductName:
        string;
    Unit:
        string;
}

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
    // MB : the model; SP / AC : a summary of the items
    ModelName:
        string;
    // SP / AC
    Lines:
        BookingLine[];
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

// SP / AC : the Add Item filters
export interface BookingCategory
{
    Id:
        number;
    // Sub category : its category
    ParentId:
        number;
    Name:
        string;
}

export interface BookingsPage
{
    ProductType:
        BookingType;
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
    Categories:
        BookingCategory[];
    SubCategories:
        BookingCategory[];
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

// The full customer card after a pick (Sales Invoice customer
// lookup by phone : receivable, credit limit, membership)
export interface BookingCustomerCard
{
    Found:
        boolean;
    CustomerId:
        number;
    CustomerCode:
        string;
    DisplayName:
        string;
    Phone:
        string;
    Address:
        string;
    CustomerType:
        string;
    CustomerTag:
        string;
    IsCorporate:
        boolean;
    IsWalkIn:
        boolean;
    IsActive:
        boolean;
    Balance:
        number;
    BalanceSide:
        string;
    CreditLimit:
        number;
    MembershipNo:
        string;
    MembershipCard:
        string;
    MembershipExpiry:
        string;
    Message:
        string;
}

export interface CreateBooking
{
    Date:
        string;
    CustomerId:
        number;
    // MB
    MotorBikeId:
        number;
    // SP / AC
    Lines:
        BookingLine[];
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
    Lines:
        BookingLine[];
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

// Open bookings of a customer (Sales Invoice of the type)
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
    // SP / AC : the items
    Lines:
        BookingLine[];
    AdvanceAmount:
        number;
    IsExpired:
        boolean;
    ValidUntil:
        string;
    HeldByInvoiceNo:
        string;
}