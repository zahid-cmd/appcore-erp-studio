//===============================================================
// Product Pricing - Motor Bikes : price cards (2026-11-09)
//
// A card per supplier : Regular (from Effective From until a later
// Regular card) or Campaign (Effective From .. To, wins inside its
// dates). Each line : a model + colour, its DP (real payable) and
// MRP (VAT inclusive); commission = MRP - DP. The card in force is
// the single source of the Motor Bike MRP.
//===============================================================

export const PRODUCT_PRICING_MB_ROUTE =
    '/inventory-management/pricing-labels/product-pricing-motor-bikes';

export type PriceCardType =
    'Regular' | 'Campaign';

export interface PriceCardLine
{
    LineNo:
        number;
    MotorBikeId:
        number;
    ProductCode:
        string;
    ProductName:
        string;
    Dp:
        number;
    Mrp:
        number;
    VatRate:
        number;
    VatInside:
        number;
    NetSale:
        number;
    Commission:
        number;
    CommissionPercent:
        number;
}

export interface PriceCard
{
    Id:
        number;
    PublicId:
        string;
    CardNo:
        string;
    SupplierCode:
        string;
    SupplierName:
        string;
    CardType:
        string;
    // yyyy-MM-dd
    EffectiveFrom:
        string;
    // yyyy-MM-dd ('' = none)
    EffectiveTo:
        string;
    Reference:
        string;
    Remarks:
        string;
    ProductCount:
        number;
    // Draft / Posted / Cancelled
    Status:
        string;
    PostedDate:
        string;
    CancelledDate:
        string;
    CancelReason:
        string;
    // Posted and deciding at least one model today
    InForce:
        boolean;
    Lines:
        PriceCardLine[];
}

export interface PriceCardLineInput
{
    MotorBikeId:
        number;
    Dp:
        number;
    Mrp:
        number;
}

export interface SavePriceCard
{
    SupplierCode:
        string;
    CardType:
        string;
    EffectiveFrom:
        string;
    EffectiveTo:
        string;
    Reference:
        string;
    Remarks:
        string;
    Lines:
        PriceCardLineInput[];
}

export interface PriceCardSaved
{
    Id:
        number;
    PublicId:
        string;
    CardNo:
        string;
    Status:
        string;
}

export interface PriceCardSupplier
{
    SupplierCode:
        string;
    SupplierName:
        string;
}

export interface PriceCardProduct
{
    MotorBikeId:
        number;
    ProductCode:
        string;
    ProductName:
        string;
    ModelId:
        number;
    ModelName:
        string;
    ColorName:
        string;
    ImagePath:
        string;
    IsActive:
        boolean;
}

export interface PriceCardVatRule
{
    Rate:
        number;
    EffectiveFrom:
        string;
    ValidTo:
        string;
}

export interface PriceCardDefaults
{
    Today:
        string;
    NextNumber:
        string;
    Suppliers:
        PriceCardSupplier[];
    Products:
        PriceCardProduct[];
    VatRules:
        PriceCardVatRule[];
}

// The card in force for a supplier + model on a date
export interface PriceCardActive
{
    MotorBikeId:
        number;
    CardId:
        number;
    CardNo:
        string;
    CardType:
        string;
    EffectiveFrom:
        string;
    EffectiveTo:
        string;
    Dp:
        number;
    Mrp:
        number;
    Commission:
        number;
}


//===============================================================
// Helpers
//===============================================================

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 2026-11-09 -> 09-Nov-2026
export function priceCardDate
(
    iso:
        string
):
    string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    return m
        ? `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${m[1]}`
        : '';
}

// Sales VAT % on a date (0 = no rule)
export function priceCardVatRate
(
    rules:
        PriceCardVatRule[],
    iso:
        string
):
    number
{
    return [...(rules ?? [])]
        .filter(x => x.EffectiveFrom <= iso && (!x.ValidTo || x.ValidTo >= iso))
        .sort((a, b) => b.EffectiveFrom.localeCompare(a.EffectiveFrom))[0]?.Rate ?? 0;
}

export function roundMoney
(
    value:
        number
):
    number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}
