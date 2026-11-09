//===============================================================
// Sales Invoices model (shared by Sales Invoices - SP / AC / MB)
//
// Field names = the API (PascalCase, CONTRACT.md section 7).
// The server is the single source of every figure : the page
// sends quantities / price edits / discounts and shows the quote.
//===============================================================

import
{
    VoucherDebitLine
}
from '../../../../shared/components/accounting/accounting.models';

export type SalesInvoicePageType =
    'SP'
    |
    'AC'
    |
    'MB';

// Draft -> Approved -> Posted ; Cancelled
export type SalesInvoiceStatus =
    'Draft'
    |
    'Approved'
    |
    'Posted'
    |
    'Cancelled';

// Special discount on the whole invoice
export type SalesInvoiceSpecialType =
    'None'
    |
    'Percent'
    |
    'Amount';


//===============================================================
// A batch a line takes its units from (FIFO)
//===============================================================

export interface SalesInvoiceAllocation
{
    // 0 = unallocated (sold without stock)
    StockBatchId:
        number;
    BatchNo:
        string;
    Quantity:
        number;
    // Batch MRP
    Mrp:
        number;
    // Selling price of these units
    UnitPrice:
        number;
    UnitCost:
        number;
    // Cost of these units
    Value:
        number;
    VatRate:
        number;
    BaseVatPerUnit:
        number;
}


//===============================================================
// A priced line (quote / saved invoice)
//===============================================================

export interface SalesInvoiceLine
{
    // 0 in a quote
    SalesInvoiceLineId:
        number;
    LineNo:
        number;
    // Spare Parts / Lubricants
    ProductType:
        string;
    ProductId:
        number;
    ProductCode:
        string;
    PartNumber:
        string;
    // "<Part No> - <Part Name>"
    ProductName:
        string;
    Unit:
        string;
    Quantity:
        number;
    // Lowest MRP of the batches taken
    Mrp:
        number;
    // "500.00" or "6 @ 500.00 + 4 @ 550.00"
    MrpText:
        string;
    HasMixedMrp:
        boolean;
    MrpCount:
        number;
    PriceEdited:
        boolean;
    // Edited price, else Gross / Quantity
    UnitPrice:
        number;
    GrossAmount:
        number;
    // None / Campaign / Membership
    DiscountSource:
        string;
    // e.g. "Membership GOLD 5%"
    DiscountLabel:
        string;
    CampaignMembershipPercent:
        number;
    CampaignMembershipAmount:
        number;
    // The line % typed
    SpecialDiscountPercent:
        number;
    // Line % or its share of the invoice special
    SpecialAmount:
        number;
    NetAmount:
        number;
    FractionalShare:
        number;
    // Net - FractionalShare
    LineTotal:
        number;
    VatRate:
        number;
    VatInside:
        number;
    BaseVat:
        number;
    CostAmount:
        number;
    PriceAdjustmentShare:
        number;
    NetExclVat:
        number;
    BelowCost:
        boolean;
    BelowCostMessage:
        string;
    StockShort:
        boolean;
    // Saleable on hand in the warehouse
    OnHand:
        number;
    UnallocatedQuantity:
        number;
    ReturnedQuantity:
        number;
    Allocations:
        SalesInvoiceAllocation[];
    // MB : the bike sold (null / '' on SP / AC lines)
    MotorBikeUnitId?:
        number | null;
    ChassisNo?:
        string;
    EngineNo?:
        string;
    ColorName?:
        string;
    ManufactureYear?:
        number | null;
    CkdStatus?:
        string;
    // Pending / Delivered / Cancelled
    DeliveryStatus?:
        string;
    DeliveredDate?:
        string;
}


//===============================================================
// The customer's active membership
//===============================================================

export interface SalesInvoiceMembership
{
    MembershipId:
        number;
    MembershipNo:
        string;
    CardName:
        string;
    SpDiscountPercent:
        number;
    DiscountLedgerCode:
        string;
    // yyyy-MM-dd
    ExpiryDate:
        string;
}


//===============================================================
// Customer look-up (by phone) / walk-in created
//===============================================================

// Customer live search : one match (phone 1 / 2, name or code)
export interface SalesInvoiceCustomerSearchItem
{
    CustomerId:
        number;
    CustomerCode:
        string;
    CustomerName:
        string;
    DisplayName:
        string;
    Phone1:
        string;
    Phone2:
        string;
    CustomerType:
        string;
    IsWalkIn:
        boolean;
    // Corporate / Institution (Inbound)
    IsCorporate:
        boolean;
    MatchedOn:
        string;
}

export interface SalesInvoiceCustomer
{
    Found:
        boolean;
    CustomerId:
        number;
    CustomerCode:
        string;
    DisplayName:
        string;
    Name:
        string;
    Phone:
        string;
    Address:
        string;
    // Inbound / Outside
    CustomerType:
        string;
    IsWalkIn:
        boolean;
    // Inbound / Outside / Walk-in
    CustomerTag:
        string;
    // Corporate / Institution (Inbound) : may buy on a Corporate sale
    IsCorporate:
        boolean;
    IsActive:
        boolean;
    ReceivableLedgerCode:
        string;
    // + Dr (owes us) / - Cr
    Balance:
        number;
    // Dr / Cr / ''
    BalanceSide:
        string;
    // 0 = cash only
    CreditLimit:
        number;
    Membership:
        SalesInvoiceMembership | null;
    CanAddWalkIn:
        boolean;
    Message:
        string;
}


//===============================================================
// A product found by the search box / a scanned barcode
//===============================================================

export interface SalesInvoiceProduct
{
    ProductId:
        number;
    ProductCode:
        string;
    PartNumber:
        string;
    PartName:
        string;
    ProductName:
        string;
    // Spare Parts / Lubricants
    ProductType:
        string;
    Unit:
        string;
    OnHand:
        number;
    // Lowest saleable MRP (else current MRP; 0 = not priced)
    Mrp:
        number;
    LatestMrp:
        number;
    HasMixedMrp:
        boolean;
    MrpCount:
        number;
    // Set when a batch barcode was scanned
    ScannedBatchId:
        number | null;
    IsActive:
        boolean;
}


//===============================================================
// Page switches (resolved by the server)
//===============================================================

export interface SalesInvoiceSwitches
{
    // 0021
    PostOnApproval:
        boolean;
    // 0022
    AllowCreditSale:
        boolean;
    // 0023 (only with 0022)
    EnforceCreditLimit:
        boolean;
    // 0024
    AllowPriceEdit:
        boolean;
    // 0024 Value; null = no limit
    MaxPriceEditPercent:
        number | null;
    // 0025
    AllowDiscount:
        boolean;
    // 0025 Value; null = no limit
    MaxDiscountPercent:
        number | null;
    // 0026
    BlockSaleBelowCost:
        boolean;
    // 0027
    AllowSaleWithoutStock:
        boolean;
    // 0028
    BackDatedSales:
        boolean;
    // 0029
    AllowCancelPosted:
        boolean;
    // 0029 Value; null = any time
    CancelWithinDays:
        number | null;
    // 0030
    PrintAfterPosting:
        boolean;
    // 0031
    AllowWalkInCustomers:
        boolean;
    // 0032
    SellAtBatchMrp:
        boolean;
    // 0033
    RoundDownWholeTaka:
        boolean;
    // MB 0073 Allow Corporate Sale, window 0074 / 0075
    // (yyyy-MM-dd; '' = open)
    AllowCorporateSale:
        boolean;
    CorporateSaleFrom:
        string;
    CorporateSaleUntil:
        string;
}


//===============================================================
// Defaults
//===============================================================

export interface SalesInvoiceBranch
{
    BranchId:
        number;
    BranchCode:
        string;
    BranchName:
        string;
}

// Add Items filter : category, or sub category (ParentId = category)
export interface SalesInvoiceCategory
{
    Id:
        number;
    ParentId:
        number;
    Code:
        string;
    Name:
        string;
}

export interface SalesInvoiceWarehouse
{
    WarehouseId:
        number;
    WarehouseCode:
        string;
    WarehouseName:
        string;
    IsDefault:
        boolean;
    HasStock:
        boolean;
}

export interface SalesInvoicePerson
{
    UserProfileId:
        number;
    DisplayName:
        string;
    UserName:
        string;
}

export interface SalesInvoiceDefaults
{
    PageType:
        string;
    // '' when no number can be given (Message says why)
    NextNumberPreview:
        string;
    // yyyy-MM-dd
    Today:
        string;
    InvoiceDate:
        string;
    Message:
        string;
    Branch:
        SalesInvoiceBranch;
    FinancialYearId:
        number;
    FinancialYearName:
        string;
    FinancialYearCode:
        string;
    // Default first
    Warehouses:
        SalesInvoiceWarehouse[];
    DefaultWarehouseId:
        number | null;
    // Business Configuration / Branch Assignment : false = the
    // page is blocked here (BranchLineMessage says why)
    BusinessLine:
        string;
    UserAllottedToBranch:
        boolean;
    BranchRunsLine:
        boolean;
    BranchLineMessage:
        string;
    SalesPersons:
        SalesInvoicePerson[];
    // Current user
    DefaultSalesPersonId:
        number;
    Categories:
        SalesInvoiceCategory[];
    SubCategories:
        SalesInvoiceCategory[];
    Switches:
        SalesInvoiceSwitches;
    // Page activity "Give Special Discount" (0025 is separate)
    CanGiveSpecialDiscount:
        boolean;
    CanApprove:
        boolean;
    CanReturn:
        boolean;
    CanPost:
        boolean;
    CanCancel:
        boolean;
    CanPrint:
        boolean;
    VatApplicable:
        boolean;
    VatApplicableSince:
        string;
    MaxPriceEditPercent:
        number | null;
    MaxDiscountPercent:
        number | null;
}


//===============================================================
// Quote (server pricing of the page's lines)
//===============================================================

export interface SalesInvoiceQuote
{
    // In the order sent (LineNo 1..n)
    Lines:
        SalesInvoiceLine[];
    TotalQuantity:
        number;
    GrossAmount:
        number;
    CampaignDiscount:
        number;
    MembershipDiscount:
        number;
    CampaignMembershipDiscount:
        number;
    SpecialDiscount:
        number;
    FractionalDiscount:
        number;
    InvoiceTotal:
        number;
    TotalVatInside:
        number;
    TotalBaseVat:
        number;
    CostAmount:
        number;
    PaidAmount:
        number;
    DueAmount:
        number;
    VatApplicable:
        boolean;
    Membership:
        SalesInvoiceMembership | null;
    // Receivable before this invoice, + = Dr
    CustomerBalance:
        number;
    CreditLimit:
        number;
    // Save allowed
    Warnings:
        string[];
    // Save would refuse
    Errors:
        string[];
    CanSave:
        boolean;
}


//===============================================================
// List row
//===============================================================

export interface SalesInvoiceListItem
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

    SalesInvoiceId:
        number;
    PageType:
        string;
    InvoiceNo:
        string;
    // yyyy-MM-dd
    InvoiceDate:
        string;
    BranchName:
        string;
    WarehouseName:
        string;
    CustomerCode:
        string;
    // The customer's Display Name
    CustomerName:
        string;
    CustomerPhone:
        string;
    // Inbound / Outside / Walk-in
    CustomerTag:
        string;
    // MB : Regular / Corporate; others ''
    SaleType:
        string;
    LineCount:
        number;
    InvoiceTotal:
        number;
    PaidAmount:
        number;
    DueAmount:
        number;
    Status:
        string;
    CreatedDate:
        string;
}


//===============================================================
// One invoice (by id)
//===============================================================

export interface SalesInvoice
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

    SalesInvoiceId:
        number;
    PageType:
        string;
    InvoiceNo:
        string;
    // yyyy-MM-dd
    InvoiceDate:
        string;
    BranchId:
        number;
    BranchCode:
        string;
    BranchName:
        string;
    FinancialYearId:
        number;
    WarehouseId:
        number;
    WarehouseName:
        string;
    SalesPersonId:
        number | null;
    SalesPersonName:
        string;
    CustomerId:
        number;
    CustomerCode:
        string;
    CustomerName:
        string;
    CustomerPhone:
        string;
    CustomerAddress:
        string;
    CustomerType:
        string;
    CustomerIsWalkIn:
        boolean;
    CustomerTag:
        string;
    // MB : Regular / Corporate; others ''
    SaleType:
        string;
    ReceivableLedgerCode:
        string;
    MembershipId:
        number | null;
    MembershipNo:
        string;
    MembershipCardName:
        string;
    MembershipDiscountPercent:
        number;
    VatApplicable:
        boolean;
    InvoiceSpecialType:
        SalesInvoiceSpecialType;
    InvoiceSpecialValue:
        number;
    TotalQuantity:
        number;
    GrossAmount:
        number;
    CampaignDiscount:
        number;
    MembershipDiscount:
        number;
    CampaignMembershipDiscount:
        number;
    SpecialDiscount:
        number;
    FractionalDiscount:
        number;
    InvoiceTotal:
        number;
    TotalVatInside:
        number;
    TotalBaseVat:
        number;
    CostAmount:
        number;
    PaidAmount:
        number;
    DueAmount:
        number;
    Narration:
        string;
    Status:
        string;
    // '' until posted
    JournalNo:
        string;
    ReceiptVoucherId:
        number | null;
    ReceiptVoucherNo:
        string;
    CancelReason:
        string;
    CreatedBy:
        number;
    CreatedByName:
        string;
    CreatedDate:
        string;
    ModifiedBy:
        number | null;
    ModifiedDate:
        string;
    ApprovedBy:
        number | null;
    ApprovedByName:
        string;
    ApprovedDate:
        string;
    PostedBy:
        number | null;
    PostedByName:
        string;
    PostedDate:
        string;
    CancelledBy:
        number | null;
    CancelledByName:
        string;
    CancelledDate:
        string;
    Lines:
        SalesInvoiceLine[];
    // Payment Desk rows saved (= the Receipt Voucher debit rows)
    Payments:
        VoucherDebitLine[];
}


//===============================================================
// Requests
//===============================================================

// A line sent (quote / create / update)
export interface CreateSalesInvoiceLine
{
    // SparePartId (SP)
    ProductId:
        number;
    Quantity:
        number;
    // Price edit; null = batch MRP(s)
    UnitPrice:
        number | null;
    // null = none
    SpecialDiscountPercent:
        number | null;
    // MB : the bike (chassis) sold; quantity 1
    MotorBikeUnitId?:
        number | null;
}

// A Payment Desk row sent (= ReceiptVoucherDebitDto)
export interface SalesInvoicePaymentRow
{
    Mode:
        string;
    LedgerType:
        string;
    SubGroupCode:
        string;
    SubGroupName:
        string;
    LedgerCode:
        string;
    LedgerName:
        string;
    AccountId:
        number;
    Amount:
        number;
    ShortNotes:
        string;
    ChargePercent:
        number;
    ChargeAmount:
        number;
    ChargeBorneBy:
        string;
    CardSetupId:
        number;
    CardName:
        string;
    TransactionRef:
        string;
    TenureMonths:
        number;
    InterestPercent:
        number;
    InterestAmount:
        number;
    TotalCharged:
        number;
    CheckNo:
        string;
    // yyyy-MM-dd
    CheckDate:
        string;
    CheckBank:
        string;
    CheckStatus:
        string;
    ClearedVoucherNo:
        string;
}

export interface CreateSalesInvoice
{
    // Ignored by the server (the controller's own)
    PageType:
        SalesInvoicePageType;
    // yyyy-MM-dd
    InvoiceDate:
        string;
    // Ignored when the token has a branch
    BranchId:
        number;
    WarehouseId:
        number;
    // null = current user
    SalesPersonId:
        number | null;
    CustomerId:
        number;
    Lines:
        CreateSalesInvoiceLine[];
    InvoiceSpecialType:
        SalesInvoiceSpecialType;
    // % or Tk
    InvoiceSpecialValue:
        number;
    Payments:
        SalesInvoicePaymentRow[];
    // Single line, at most 500
    Narration:
        string;
    // MB : Regular / Corporate; others ''
    SaleType:
        string;
}

export interface UpdateSalesInvoice
    extends CreateSalesInvoice
{
    SalesInvoiceId:
        number;
}

export interface SalesInvoiceWalkIn
{
    Name:
        string;
    Phone:
        string;
    Address:
        string;
}


//===============================================================
// Saved (create / update / post)
//===============================================================

export interface SalesInvoiceSaved
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

    SalesInvoiceId:
        number;
    InvoiceNo:
        string;
    Status:
        string;
    Posted:
        boolean;
    // '' = no payment
    ReceiptVoucherNo:
        string;
    Warnings:
        string[];
}


//===============================================================
// Notice the form leaves for the list (router state) after Save /
// Post / Approve / Return / Cancel : shown inline (no toasts)
//===============================================================

export type SalesInvoiceNoticeTone =
    'ok'
    |
    'warn'
    |
    'error';

export interface SalesInvoiceListNotice
{
    siNotice:
        string;
    siTone:
        SalesInvoiceNoticeTone;
    // A printable invoice : the list offers Print / Receipt links
    // (a print tab opened after a save may be blocked)
    // (the invoice's uuid)
    siPrintId?:
        string;
}


//===============================================================
// Helpers
//===============================================================

// Phone of a customer : 11 digits starting 01
export function isCustomerPhone
(
    value:
        string
):
    boolean
{
    return /^01\d{9}$/.test(
        (value ?? '').trim()
    );
}

// Plain ASCII for anything sent to the server (the database is
// WIN1252) : arrows, dashes, quotes and other symbols become
// their ASCII forms; anything else outside ASCII is dropped
export function toAsciiText
(
    value:
        string | null | undefined
):
    string
{
    return String(value ?? '')
        .replace(/\u2192/g, '->')
        .replace(/\u2190/g, '<-')
        .replace(/[\u2013\u2014\u2212]/g, '-')
        .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
        .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
        .replace(/\u2026/g, '...')
        .replace(/[\u00A0\u2007\u202F]/g, ' ')
        .replace(/\u00B7/g, '-')
        .replace(/\u00D7/g, 'x')
        .replace(/[^\x20-\x7E]/g, '');
}


//===============================================================
// MB : a bike in stock (model -> colour -> chassis picker)
//===============================================================

export interface SalesInvoiceBikeUnit
{
    MotorBikeUnitId:
        number;
    ProductId:
        number;
    ProductCode:
        string;
    ProductName:
        string;
    ProductSubCategoryId:
        number;
    ModelName:
        string;
    ColorName:
        string;
    ChassisNo:
        string;
    EngineNo:
        string;
    // From the purchase / receiving ('' = not kept)
    KeyNo?:
        string;
    BatteryNo?:
        string;
    ManufactureYear:
        number | null;
    // Yes / No
    CkdStatus:
        string;
    // yyyy-MM-dd
    StockInDate:
        string;
    Mrp:
        number;
    // On another open (draft / approved) invoice
    OnInvoiceNo:
        string;
    // Picture of the model (full URL; '' = none) : the shelf
    ImageUrl:
        string;
}
