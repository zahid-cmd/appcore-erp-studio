/* ============================================================
   Purchase Orders (shared by MB / SP / AC)
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

    // Switch "Free Goods Allowed" (no price, lowers the unit cost)
    FreeQuantity:
        number;

    // VAT-inclusive selling price (0 = not known yet)
    Mrp:
        number;

    // On the order's Profit On basis
    ProfitPercent:
        number;

    // DP per unit (4 decimals when worked back from a line total)
    UnitPrice:
        number;

    // DP or line total typed over the calculated figure
    IsAdjusted:
        boolean;

    // DpAmount typed (DP worked back from it)
    IsTotalTyped:
        boolean;

    // MRP × Qty
    GrossMrp:
        number;

    // DP × Qty (or the typed line total)
    DpAmount:
        number;

    // GrossMrp - DpAmount
    ProfitAmount:
        number;

    // Share of the additional discount
    DiscountShare:
        number;

    // DpAmount - DiscountShare
    NetAmount:
        number;

    VatRate:
        number;

    // VAT charged, sales VAT applicable and the rule allows input
    // credit; otherwise the VAT is part of the cost
    VatClaimable:
        boolean;

    // Without VAT
    Amount:
        number;

    VatAmount:
        number;

    // Payable for the line
    LineTotal:
        number;

    // Whole-taka line rounding
    RoundingShare:
        number;

    // Amount without VAT / (Qty + Free Qty)
    NetUnitCost:
        number;

    BilledQuantity:
        number;

    ShortNotes:
        string;
}


export interface PurchaseOrder
{
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

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

    TotalFreeQuantity:
        number;

    // VAT applicability on the order date + this invoice's choice
    PurchaseVatApplicable:
        boolean;

    SalesVatApplicable:
        boolean;

    NoVatInvoice:
        boolean;

    VatCharged:
        boolean;

    TotalMrp:
        number;

    TotalProfit:
        number;

    TotalDp:
        number;

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

    FreeQuantity:
        number;

    Mrp:
        number;

    ProfitPercent:
        number;

    // DP per unit
    UnitPrice:
        number;

    IsAdjusted:
        boolean;

    IsTotalTyped:
        boolean;

    // Typed line total (0 when not typed)
    DpAmount:
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

    InvoicePriceBasis:
        PurchaseOrderInvoicePrice;

    ProfitBasis:
        PurchaseOrderProfitBasis;

    DefaultProfitPercent:
        number;

    AdditionalDiscountType:
        PurchaseOrderDiscountType;

    AdditionalDiscountValue:
        number;

    // "No VAT on this invoice"
    NoVatInvoice:
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
    // The id used in links and API calls (uuid v7)
    PublicId?:
        string;

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

    // "No VAT on this invoice" of the supplier's last order
    // Header Margin % of the supplier's latest MRP-invoice PO /
    // purchase (null = none) and that document
    LastMarginPercent?:
        number | null;
    LastMarginNo?:
        string;
    LastNoVatInvoice?:
        boolean;

    // Supplier terms (Supplier Profile); '' / null = not set
    //   Prices : Incl / Excl / None ; Invoice Price : DP / MRP
    DefaultPriceEntry?:
        string;

    DefaultInvoicePrice?:
        string;

    // Default Profit % and what it is taken on
    DefaultProfitPercent?:
        number | null;

    DefaultProfitOn?:
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

    // Full image URL ('' = none; accessories have no image)
    ImageUrl:
        string;

    // Stock levels of the item (company wide; 0 = not set)
    ReorderLevel:
        number;

    RedLevel:
        number;

    MaxStockLevel:
        number;

    // On this page's approved / placed orders, not yet billed
    OnOrder:
        number;

    // Company stock (all branches) = In Transit + On Hand; null =
    // nothing ever received of it
    TotalStock:
        number | null;

    // The same by branch (the 📍 list); only branches holding it
    StockByBranch:
        PurchaseOrderStockBranch[];

    IsActive:
        boolean;
}

// One branch's stock of a product
export interface PurchaseOrderStockBranch
{
    BranchId:
        number;

    BranchName:
        string;

    // Purchased, not yet received into a warehouse
    InTransit:
        number;

    // In the branch's warehouses
    OnHand:
        number;
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

//===============================================================
// Pricing (SP / AC, approved 2026-10-29) - the server works out
// the same figures and stores its own
//
//   Invoice Price : MRP (lines at MRP less profit) / DP
//   Profit On     : DP  → DP = MRP / (1 + p)   (markup)
//                   MRP → DP = MRP × (1 - p)   (margin)
//   Additional Discount : spread over the lines by value (the
//   last line takes the remainder)
//   Net Unit Cost : amount without VAT / (Qty + Free Qty) when the
//                   VAT is claimable, otherwise the payable
//   Whole taka    : Payable only (Round off) or every line by the
//                   largest remainder method
//===============================================================

export type PurchaseOrderInvoicePrice =
    'MRP'
    |
    'DP';

export type PurchaseOrderProfitBasis =
    'DP'
    |
    'MRP';

export type PurchaseOrderDiscountType =
    'None'
    |
    'Percent'
    |
    'Amount';

export type PurchaseOrderRounding =
    'None'
    |
    'Nearest'
    |
    'Up'
    |
    'Down';

export interface PurchaseOrderPricingTerms
{
    InvoicePriceBasis:
        PurchaseOrderInvoicePrice;

    ProfitBasis:
        PurchaseOrderProfitBasis;

    PriceIncludesVat:
        boolean;

    AdditionalDiscountType:
        PurchaseOrderDiscountType;

    AdditionalDiscountValue:
        number;

    RoundingMethod:
        PurchaseOrderRounding;

    WholeTakaLines:
        boolean;

    // false : no VAT on the order (VAT % 0 on every line)
    VatCharged:
        boolean;
}

// VAT applicability of a product line on a date (VAT Management)
export interface PurchaseOrderVatApplicability
{
    PurchaseVatApplicable:
        boolean;

    SalesVatApplicable:
        boolean;

    // yyyy-MM-dd of the change in force ('' = never changed)
    PurchaseSince:
        string;

    SalesSince:
        string;
}

export interface PurchaseOrderPricingResult
{
    lines:
        PurchaseOrderLine[];

    // Payable rounding (0 when the lines are whole taka)
    roundingAdjustment:
        number;

    // '' = fine
    problem:
        string;
}

// Last terms of an item (page prefill)
export interface PurchaseOrderLastTerms
{
    ProductCode:
        string;

    // 0 = no MRP on any order yet
    LastMrp:
        number;

    LastMrpOrderNo:
        string;

    HasProfit:
        boolean;

    ProfitPercent:
        number;

    ProfitBasis:
        string;

    ProfitOrderNo:
        string;
    // yyyy-MM-dd of that PO / purchase
    ProfitDate?:
        string;

    // This supplier's latest line : its DP (0 = never bought),
    // whether that order's prices included VAT, its VAT rate
    LastDp:
        number;

    LastDpIncludesVat:
        boolean;

    LastVatRate:
        number;

    LastDpOrderNo:
        string;
}

// Half away from zero (same as the server)
export function poRound
(
    value:
        number,
    places:
        number
):
    number
{
    const factor =
        10 ** places;

    const sign =
        value < 0 ? -1 : 1;

    return sign * Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
}

export function poDpFromMrp
(
    mrp:
        number,
    percent:
        number,
    basis:
        PurchaseOrderProfitBasis
):
    number
{
    return basis === 'DP'
        ? poRound(mrp / (1 + percent / 100), 2)
        : poRound(mrp * (1 - percent / 100), 2);
}

export function poMrpFromDp
(
    dp:
        number,
    percent:
        number,
    basis:
        PurchaseOrderProfitBasis
):
    number
{
    if
    (
        basis === 'DP'
    )
    {
        return poRound(dp * (1 + percent / 100), 2);
    }

    return percent < 100
        ? poRound(dp / (1 - percent / 100), 2)
        : 0;
}

export function poProfitFrom
(
    mrp:
        number,
    dp:
        number,
    basis:
        PurchaseOrderProfitBasis
):
    number
{
    if
    (
        !(mrp > 0)
        ||
        !(dp > 0)
    )
    {
        return 0;
    }

    const percent =
        basis === 'DP'
            ? (mrp / dp - 1) * 100
            : (1 - dp / mrp) * 100;

    return Math.min(Math.max(poRound(percent, 2), 0), 99999.99);
}

// The same deal on the other basis (25% on DP = 20% on MRP)
export function poConvertProfit
(
    percent:
        number,
    from:
        string,
    to:
        PurchaseOrderProfitBasis
):
    number
{
    if
    (
        from === to
        ||
        !(percent > 0)
    )
    {
        return percent;
    }

    return from === 'DP'
        ? poRound(percent * 100 / (100 + percent), 2)
        : percent < 100
            ? poRound(percent * 100 / (100 - percent), 2)
            : 0;
}

export function pricePurchaseOrder
(
    terms:
        PurchaseOrderPricingTerms,
    source:
        PurchaseOrderLine[]
):
    PurchaseOrderPricingResult
{
    const money =
        (value: number): number =>
            poRound(value, 2);

    const unitCost =
        (amount: number, units: number): number =>
            units > 0
                ? poRound(amount / units, 4)
                : 0;

    let problem =
        '';

    // DP amount, gross at MRP, profit
    const lines:
        PurchaseOrderLine[] =
        source.map
        (
            line =>
            {
                const dpAmount =
                    line.IsTotalTyped
                        ? money(line.DpAmount)
                        : money(line.UnitPrice * line.Quantity);

                const dp =
                    line.IsTotalTyped
                        ? (line.Quantity > 0 ? poRound(dpAmount / line.Quantity, 4) : 0)
                        : line.UnitPrice;

                const grossMrp =
                    line.Mrp > 0
                        ? money(line.Mrp * line.Quantity)
                        : 0;

                return {
                    ...line,
                    VatRate:terms.VatCharged ? line.VatRate : 0,
                    VatClaimable:terms.VatCharged && line.VatClaimable,
                    UnitPrice:dp,
                    DpAmount:dpAmount,
                    GrossMrp:grossMrp,
                    ProfitAmount:line.Mrp > 0 ? money(grossMrp - dpAmount) : 0
                };
            }
        );

    // Additional discount
    const totalDp =
        money(lines.reduce((sum, x) => sum + x.DpAmount, 0));

    let discount =
        terms.AdditionalDiscountType === 'Percent'
            ? money(totalDp * terms.AdditionalDiscountValue / 100)
            : terms.AdditionalDiscountType === 'Amount'
                ? money(terms.AdditionalDiscountValue)
                : 0;

    if
    (
        discount > 0
        &&
        discount >= totalDp
    )
    {
        problem =
            'The Additional Discount must be less than the total at DP.';

        discount =
            0;
    }

    let given =
        0;

    lines.forEach
    (
        (line, index) =>
        {
            const share =
                index === lines.length - 1
                    ? money(discount - given)
                    : totalDp > 0
                        ? money(discount * line.DpAmount / totalDp)
                        : 0;

            given =
                money(given + share);

            const net =
                money(line.DpAmount - share);

            let amount:
                number;

            let vat:
                number;

            let total:
                number;

            if
            (
                terms.PriceIncludesVat
            )
            {
                amount =
                    money(net * 100 / (100 + line.VatRate));

                vat =
                    money(net - amount);

                total =
                    net;
            }
            else
            {
                vat =
                    money(net * line.VatRate / 100);

                amount =
                    net;

                total =
                    money(net + vat);
            }

            line.DiscountShare = share;
            line.NetAmount = net;
            line.Amount = amount;
            line.VatAmount = vat;
            line.LineTotal = total;
            line.RoundingShare = 0;
            // VAT not claimable (or none) : it is part of the cost
            line.NetUnitCost = unitCost(line.VatClaimable ? amount : total, line.Quantity + (line.FreeQuantity || 0));
        }
    );

    // Whole-taka rounding
    let roundingAdjustment =
        0;

    if
    (
        terms.RoundingMethod !== 'None'
        &&
        lines.length > 0
    )
    {
        const exact =
            money(lines.reduce((sum, x) => sum + x.LineTotal, 0));

        const rounded =
            terms.RoundingMethod === 'Up'
                ? Math.ceil(exact - 1e-9)
                : terms.RoundingMethod === 'Down'
                    ? Math.floor(exact + 1e-9)
                    : poRound(exact, 0);

        if
        (
            !terms.WholeTakaLines
        )
        {
            roundingAdjustment =
                money(rounded - exact);
        }
        else
        {
            // Largest remainder : every line down to whole taka, the
            // taka left go to the largest fractions (earlier line
            // first on a tie)
            const floors =
                lines.map(x => Math.floor(x.LineTotal + 1e-9));

            const leftover =
                Math.round(rounded - floors.reduce((sum, x) => sum + x, 0));

            lines
                .map((x, index) => ({ index, fraction:money(x.LineTotal - floors[index]) }))
                .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
                .forEach
                (
                    (item, rank) =>
                    {
                        const line =
                            lines[item.index];

                        const payable =
                            floors[item.index] + (rank < leftover ? 1 : 0);

                        line.RoundingShare = money(payable - line.LineTotal);
                        line.LineTotal = payable;
                        line.Amount = money(payable * 100 / (100 + line.VatRate));
                        line.VatAmount = money(payable - line.Amount);
                        line.NetUnitCost = unitCost(line.VatClaimable ? line.Amount : payable, line.Quantity + (line.FreeQuantity || 0));
                    }
                );
        }
    }

    return {
        lines,
        roundingAdjustment,
        problem
    };
}
