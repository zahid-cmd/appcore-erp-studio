//===============================================================
// Purchases model (shared by Purchases - MB / SP / AC)
//
// The pricing types and functions are the Purchase Order's
// (purchase-order.model) : a purchase is priced the same way.
//===============================================================

import
{
    PurchaseOrderLine,
    PurchaseOrderPageType,
    PurchaseOrderSupplierOption,
    PurchaseOrderProductOption
}
from '../purchase-order/purchase-order.model';

export type PurchasePageType =
    PurchaseOrderPageType;

// Draft → Approved → Posted ; Cancelled
export type PurchaseStatus =
    'Draft'
    |
    'Approved'
    |
    'Posted'
    |
    'Cancelled';


//===============================================================
// One motor bike (Unit Desk)
//===============================================================

export interface PurchaseUnit
{
    MotorBikeUnitId?:
        number;
    ChassisNo:
        string;
    EngineNo:
        string;
    KeyNo:
        string;
    BatteryNo:
        string;
    Status?:
        string;
}


//===============================================================
// A purchase line : the Purchase Order line fields + its PO link and bikes
//===============================================================

export interface PurchaseLine
    extends PurchaseOrderLine
{
    PurchaseLineId?:
        number;
    // The PO line billed (null = direct purchase)
    PurchaseOrderLineId:
        number | null;
    ReturnedQuantity?:
        number;
    // Motor bikes received here (Products Received on Purchase ON)
    Units:
        PurchaseUnit[];
}


//===============================================================
// A purchase (list : header only ; by id : with lines)
//===============================================================

export interface Purchase
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

    PurchaseId:
        number;
    PageType:
        string;
    PurchaseNo:
        string;
    PurchaseDate:
        string;
    BranchId:
        number;
    BranchCode:
        string;
    BranchName:
        string;
    FinancialYearId:
        number;
    SupplierCode:
        string;
    SupplierName:
        string;
    // The Purchase Order billed (PO Required ON)
    PurchaseOrderId:
        number | null;
    OrderNo:
        string;
    SupplierInvoiceNo:
        string;
    SupplierInvoiceDate:
        string;
    MushakNo:
        string;
    MushakDate:
        string;
    DoReference:
        string;
    GatePassNo:
        string;
    WarehouseId:
        number | null;
    WarehouseName:
        string;
    PriceIncludesVat:
        boolean;
    InvoicePriceBasis:
        string;
    ProfitBasis:
        string;
    DefaultProfitPercent:
        number;
    AdditionalDiscountType:
        string;
    AdditionalDiscountValue:
        number;
    AdditionalDiscountAmount:
        number;
    RoundingMethod:
        string;
    WholeTakaLines:
        boolean;
    RoundingAdjustment:
        number;
    PurchaseVatApplicable:
        boolean;
    SalesVatApplicable:
        boolean;
    NoVatInvoice:
        boolean;
    VatCharged:
        boolean;
    TotalQuantity:
        number;
    TotalFreeQuantity:
        number;
    TotalMrp:
        number;
    TotalProfit:
        number;
    TotalDp:
        number;
    TotalAmount:
        number;
    TotalVat:
        number;
    TotalVatClaimable:
        number;
    TotalPayable:
        number;
    Narration:
        string;
    Status:
        string;
    StockedIn:
        boolean;
    VoucherNo:
        string;
    CancelReason:
        string;
    ApprovedDate:
        string;
    PostedDate:
        string;
    CancelledDate:
        string;
    CreatedDate:
        string;
    Lines:
        PurchaseLine[];
}


//===============================================================
// A line sent on save
//===============================================================

export interface SavePurchaseLine
{
    PurchaseOrderLineId:
        number | null;
    ProductCode:
        string;
    Quantity:
        number;
    FreeQuantity:
        number;
    Mrp:
        number;
    ProfitPercent:
        number;
    UnitPrice:
        number;
    IsAdjusted:
        boolean;
    IsTotalTyped:
        boolean;
    DpAmount:
        number;
    VatRate:
        number;
    ShortNotes:
        string;
    Units:
        PurchaseUnit[];
}


//===============================================================
// Create (draft)
//===============================================================

export interface CreatePurchase
{
    PageType:
        PurchasePageType;
    // yyyy-MM-dd
    PurchaseDate:
        string;
    BranchId:
        number;
    SupplierCode:
        string;
    PurchaseOrderId:
        number | null;
    SupplierInvoiceNo:
        string;
    SupplierInvoiceDate:
        string;
    MushakNo:
        string;
    MushakDate:
        string;
    DoReference:
        string;
    GatePassNo:
        string;
    WarehouseId:
        number | null;
    PriceIncludesVat:
        boolean;
    InvoicePriceBasis:
        string;
    DefaultProfitPercent:
        number;
    AdditionalDiscountType:
        string;
    AdditionalDiscountValue:
        number;
    NoVatInvoice:
        boolean;
    Narration:
        string;
    Lines:
        SavePurchaseLine[];
}


//===============================================================
// Update (draft)
//===============================================================

export interface UpdatePurchase
    extends CreatePurchase
{
    PurchaseId:
        number;
}


//===============================================================
// Saved
//===============================================================

export interface PurchaseSaved
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

    PurchaseId:
        number;
    PurchaseNo:
        string;
}


//===============================================================
// A warehouse of the branch
//===============================================================

export interface PurchaseWarehouseOption
{
    WarehouseId:
        number;
    WarehouseCode:
        string;
    WarehouseName:
        string;
    IsDefault:
        boolean;
}


//===============================================================
// Defaults : number preview, period, options
//===============================================================

export interface PurchaseDefaults
{
    // Number preview ('' when there is no open period)
    PurchaseNo:
        string;
    BranchId:
        number;
    BranchName:
        string;
    FinancialYearId:
        number;
    FinancialYearName:
        string;
    FinancialYearCode:
        string;
    PeriodMonth:
        number;
    // Why there is no number ('' = fine)
    Message:
        string;
    // yyyy-MM-dd
    Today:
        string;
    Suppliers:
        PurchaseOrderSupplierOption[];
    Products:
        PurchaseOrderProductOption[];
    Warehouses:
        PurchaseWarehouseOption[];
}


//===============================================================
// An open PO line
//===============================================================

export interface PurchaseOpenOrderLine
{
    PurchaseOrderLineId:
        number;
    LineNo:
        number;
    ProductType:
        string;
    ProductId:
        number;
    ProductCode:
        string;
    ProductName:
        string;
    Unit:
        string;
    Quantity:
        number;
    FreeQuantity:
        number;
    BilledQuantity:
        number;
    // Quantity + free not yet billed
    Remaining:
        number;
    Mrp:
        number;
    ProfitPercent:
        number;
    UnitPrice:
        number;
    VatRate:
        number;
}


//===============================================================
// An open Purchase Order of the supplier
//===============================================================

export interface PurchaseOpenOrder
{
    PurchaseOrderId:
        number;
    OrderNo:
        string;
    OrderDate:
        string;
    Status:
        string;
    BranchId:
        number;
    BranchName:
        string;
    PriceIncludesVat:
        boolean;
    InvoicePriceBasis:
        string;
    DefaultProfitPercent:
        number;
    AdditionalDiscountType:
        string;
    AdditionalDiscountValue:
        number;
    NoVatInvoice:
        boolean;
    TotalPayable:
        number;
    Lines:
        PurchaseOpenOrderLine[];
}
