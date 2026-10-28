/* ============================================================
   Purchase Orders - MB (Procurement › Motor Bike Purchase)
   Own tables per type (PurchaseOrdersMb / Sp / Ac); PageType
   MB (Motor Bikes), SP (Spare Parts & Lubricants), AC
   (Accessories) is kept on each order.
     Status : Draft → Approved → Placed → Completed
              Placed → Closed Short ; Approved / Placed → Cancelled
     VAT    : estimate (the 6.3 decides at purchase entry)
     Prices : typed VAT inclusive or exclusive
============================================================ */

export type PurchaseOrderPageType =
    'MB'
    |
    'SP'
    |
    'AC';


export type PurchaseOrderStatus =
    'Draft'
    |
    'Approved'
    |
    'Placed'
    |
    'Completed'
    |
    'Closed Short'
    |
    'Cancelled';


export interface PurchaseOrderLine
{
    LineNo:
        number;

    // Motor Bikes / Spare Parts / Lubricants / Accessories
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

    // As typed (inclusive or exclusive)
    UnitPrice:
        number;

    VatRate:
        number;

    // Without VAT
    Amount:
        number;

    VatAmount:
        number;

    LineTotal:
        number;

    BilledQuantity:
        number;

    ShortNotes:
        string;
}


export interface PurchaseOrder
{
    PurchaseOrderId:
        number;

    PageType:
        string;

    OrderNo:
        string;

    // yyyy-MM-dd
    OrderDate:
        string;

    // yyyy-MM-dd ('' = not given)
    ExpectedDate:
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

    PriceIncludesVat:
        boolean;

    TotalQuantity:
        number;

    TotalAmount:
        number;

    TotalVat:
        number;

    TotalPayable:
        number;

    Narration:
        string;

    Status:
        string;

    CloseReason:
        string;

    ApprovedDate:
        string;

    PlacedDate:
        string;

    ClosedDate:
        string;

    CreatedDate:
        string;

    Lines:
        PurchaseOrderLine[];
}


export interface SavePurchaseOrderLine
{
    ProductCode:
        string;

    Quantity:
        number;

    UnitPrice:
        number;

    VatRate:
        number;

    ShortNotes:
        string;
}


export interface CreatePurchaseOrder
{
    PageType:
        PurchaseOrderPageType;

    OrderDate:
        string;

    ExpectedDate:
        string;

    BranchId:
        number;

    SupplierCode:
        string;

    PriceIncludesVat:
        boolean;

    Narration:
        string;

    Lines:
        SavePurchaseOrderLine[];
}


export interface UpdatePurchaseOrder
    extends CreatePurchaseOrder
{
    PurchaseOrderId:
        number;
}


export interface PurchaseOrderSaved
{
    PurchaseOrderId:
        number;

    OrderNo:
        string;
}


export interface PurchaseOrderSupplierOption
{
    SupplierCode:
        string;

    DisplayName:
        string;

    SupplyType:
        string;

    Phone:
        string;

    BinNo:
        string;

    CreditDays:
        number;

    // Optional : a supplier with a brand supplies only that
    // brand's products
    BrandManagementId?:
        number | null;

    BrandName?:
        string;

    IsActive:
        boolean;
}


export interface PurchaseOrderProductOption
{
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

    CategoryId:
        number;

    CategoryName:
        string;

    SubCategoryId:
        number;

    SubCategoryName:
        string;

    // Brand of the category (null : category without one)
    BrandManagementId?:
        number | null;

    IsActive:
        boolean;
}


export interface PurchaseOrderDefaults
{
    // Number preview ('' when there is no open period)
    OrderNo:
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
}


//===============================================================
// Line amounts (same rule as the server)
//   Inclusive : Amount = round(gross × 100 / (100 + VAT))
//   Exclusive : VAT = round(gross × VAT %)
//===============================================================

export function purchaseOrderLineAmounts
(
    quantity:
        number,
    unitPrice:
        number,
    vatRate:
        number,
    priceIncludesVat:
        boolean
):
    { Amount:number; VatAmount:number; LineTotal:number }
{
    const round =
        (value: number): number =>
            Math.round((value + Number.EPSILON) * 100) / 100;

    const gross =
        round(quantity * unitPrice);

    if
    (
        priceIncludesVat
    )
    {
        const amount =
            round(gross * 100 / (100 + vatRate));

        return {
            Amount:amount,
            VatAmount:round(gross - amount),
            LineTotal:gross
        };
    }

    const vat =
        round(gross * vatRate / 100);

    return {
        Amount:gross,
        VatAmount:vat,
        LineTotal:round(gross + vat)
    };
}