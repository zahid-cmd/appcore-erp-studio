//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.Shared;


//===============================================================
// Purchase Order line : the columns every Purchase Order page
// shares. Each page keeps its own lines table and class
// (PurchaseOrdersMbLines / …SpLines / …AcLines), which only
// inherit from this one. Not a table on its own.
//
// One product per line (a product appears once per order).
//   ProductType : Motor Bikes / Spare Parts / Lubricants /
//                 Accessories
//   UnitPrice   : DP as invoiced (VAT inclusive or exclusive, see
//                 the header's PriceIncludesVat). MB : unit price.
//   Amount      : without VAT ; VatAmount ; LineTotal = payable
//   BilledQuantity : filled by purchase entries (later)
//===============================================================

public abstract class PurchaseOrderLine
{
    public long PurchaseOrderLineId { get; set; }

    public long PurchaseOrderId { get; set; }

    public int LineNo { get; set; }

    public string ProductType { get; set; } = string.Empty;

    // MotorBikeId / SparePartId / AccessoryId
    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // Free units (switch "Free Goods Allowed") : no price, lower
    // the unit cost
    public decimal FreeQuantity { get; set; }

    // VAT-inclusive selling price (0 = not known yet)
    public decimal Mrp { get; set; }

    // On the order's Profit On basis (DP / MRP)
    public decimal ProfitPercent { get; set; }

    // DP per unit (4 decimals when worked back from a line total)
    public decimal UnitPrice { get; set; }

    // DP or line total typed over the calculated figure
    public bool IsAdjusted { get; set; }

    // Line total typed (DP worked back from it)
    public bool IsTotalTyped { get; set; }

    // MRP x Qty
    public decimal GrossMrp { get; set; }

    // DP x Qty (or the typed line total)
    public decimal DpAmount { get; set; }

    // GrossMrp - DpAmount
    public decimal ProfitAmount { get; set; }

    // Share of the additional discount
    public decimal DiscountShare { get; set; }

    // DpAmount - DiscountShare
    public decimal NetAmount { get; set; }

    public decimal VatRate { get; set; }

    // VAT charged, sales VAT applicable and the VAT rule allows
    // input credit; otherwise the VAT is part of the cost
    public bool VatClaimable { get; set; } = true;

    // Without VAT
    public decimal Amount { get; set; }

    public decimal VatAmount { get; set; }

    // Payable for the line (whole taka when WholeTakaLines)
    public decimal LineTotal { get; set; }

    // Whole-taka line rounding (largest remainder)
    public decimal RoundingShare { get; set; }

    // Amount without VAT / (Qty + Free Qty), 4 decimals
    public decimal NetUnitCost { get; set; }

    public decimal BilledQuantity { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}