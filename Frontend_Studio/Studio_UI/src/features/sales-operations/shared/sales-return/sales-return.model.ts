//===============================================================
// Sales Returns - MB / SP / AC : models (API shapes, PascalCase)
//
// One return = one posted invoice : the page finds the invoice
// (SalesReturnInvoiceItem), loads what can still be returned
// (SalesReturnInvoice), then saves the quantities
// (SaveSalesReturn).
//===============================================================

export type SalesReturnPageType =
    'MB' | 'SP' | 'AC';

export type SalesReturnStatus =
    'Draft' | 'Approved' | 'Posted' | 'Cancelled';


export interface SalesReturnSwitches
{
    PostOnApproval:boolean;
    // null = any time
    ReturnWindowDays:number | null;
    PostOnApprovalCode:string;
    ReturnWindowCode:string;
    BranchId:number;
    BranchName:string;
    Today:string;
}


export interface SalesReturnInvoiceItem
{
    SalesInvoiceId:number;
    PublicId:string;
    InvoiceNo:string;
    InvoiceDate:string;
    CustomerCode:string;
    CustomerName:string;
    CustomerPhone:string;
    ItemsText:string;
    InvoiceTotal:number;
    SoldQuantity:number;
    ReturnedQuantity:number;
    ReturnableQuantity:number;
    AgeDays:number;
    OutsideWindow:boolean;
}


export interface SalesReturnInvoiceLine
{
    SalesInvoiceLineId:number;
    LineNo:number;
    ProductId:number;
    ProductCode:string;
    PartNumber:string;
    ProductName:string;
    Unit:string;
    MotorBikeUnitId:number | null;
    ChassisNo:string;
    EngineNo:string;
    ColorName:string;
    SoldQuantity:number;
    ReturnedQuantity:number;
    PendingQuantity:number;
    ReturnableQuantity:number;
    UnitPrice:number;
    GrossAmount:number;
    DiscountAmount:number;
    LineTotal:number;
    NetPerUnit:number;
    VatInside:number;
    RegistrationRefund:number;
    Blocked:string;
}


export interface SalesReturnInvoice
{
    SalesInvoiceId:number;
    PublicId:string;
    InvoiceNo:string;
    InvoiceDate:string;
    BranchId:number;
    BranchName:string;
    WarehouseName:string;
    CustomerId:number;
    CustomerCode:string;
    CustomerName:string;
    CustomerPhone:string;
    CustomerAddress:string;
    SalesPersonName:string;
    PaymentTerm:string;
    InvoiceTotal:number;
    PaidAmount:number;
    DueAmount:number;
    AgeDays:number;
    Blocked:string;
    Lines:SalesReturnInvoiceLine[];
}


export interface SaveSalesReturnLine
{
    SalesInvoiceLineId:number;
    Quantity:number;
    Reason:string;
}


export interface SaveSalesReturn
{
    InvoicePublicId:string;
    Reason:string;
    Narration:string;
    Lines:SaveSalesReturnLine[];
}


export interface SalesReturnSaved
{
    SalesReturnId:number;
    PublicId:string;
    ReturnNo:string;
    Status:string;
    ReturnTotal:number;
    Warnings:string[];
}


export interface SalesReturnListItem
{
    SalesReturnId:number;
    PublicId:string;
    ReturnNo:string;
    ReturnDate:string;
    BranchId:number;
    BranchName:string;
    SalesInvoiceNo:string;
    SalesInvoiceDate:string;
    CustomerName:string;
    CustomerPhone:string;
    ItemsText:string;
    TotalQuantity:number;
    ReturnTotal:number;
    Reason:string;
    Status:SalesReturnStatus;
}


export interface SalesReturnLine
{
    SalesReturnLineId:number;
    LineNo:number;
    SalesInvoiceLineId:number;
    InvoiceLineNo:number;
    ProductId:number;
    ProductCode:string;
    PartNumber:string;
    ProductName:string;
    Unit:string;
    MotorBikeUnitId:number | null;
    ChassisNo:string;
    EngineNo:string;
    ColorName:string;
    SoldQuantity:number;
    Quantity:number;
    UnitPrice:number;
    GrossAmount:number;
    DiscountAmount:number;
    LineTotal:number;
    VatRate:number;
    VatInside:number;
    BaseVat:number;
    RegistrationRefund:number;
    CostAmount:number;
    Reason:string;
}


export interface SalesReturn
{
    SalesReturnId:number;
    PublicId:string;
    ProductType:SalesReturnPageType;
    ReturnNo:string;
    ReturnDate:string;
    BranchId:number;
    BranchName:string;
    WarehouseName:string;
    SalesInvoiceId:number;
    InvoicePublicId:string;
    SalesInvoiceNo:string;
    SalesInvoiceDate:string;
    CustomerId:number;
    CustomerCode:string;
    CustomerName:string;
    CustomerPhone:string;
    CustomerAddress:string;
    Reason:string;
    Narration:string;
    TotalQuantity:number;
    GrossAmount:number;
    DiscountAmount:number;
    ItemsAmount:number;
    RegistrationRefund:number;
    ReturnTotal:number;
    TotalVatInside:number;
    TotalBaseVat:number;
    CostAmount:number;
    Status:SalesReturnStatus;
    VoucherNo:string;
    CancelReason:string;
    CreatedByName:string;
    CreatedDate:string;
    ApprovedByName:string;
    PostedByName:string;
    PostedDate:string;
    Lines:SalesReturnLine[];
}
