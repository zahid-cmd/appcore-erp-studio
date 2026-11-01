//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.Shared;


//===============================================================
// Purchase line : shared by Purchases - MB / SP / AC.
//===============================================================

public abstract class PurchaseLine
{
    public long PurchaseLineId { get; set; }
    public long PurchaseId { get; set; }
    public int LineNo { get; set; }
    // The Purchase Order line billed (null = direct purchase)
    public long? PurchaseOrderLineId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal FreeQuantity { get; set; }
    public decimal Mrp { get; set; }
    public decimal ProfitPercent { get; set; }
    public decimal UnitPrice { get; set; }
    public bool IsAdjusted { get; set; }
    public bool IsTotalTyped { get; set; }
    public decimal GrossMrp { get; set; }
    public decimal DpAmount { get; set; }
    public decimal ProfitAmount { get; set; }
    public decimal DiscountShare { get; set; }
    public decimal NetAmount { get; set; }
    public decimal VatRate { get; set; }
    public bool VatClaimable { get; set; } = true;
    public decimal Amount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal LineTotal { get; set; }
    // Payable-only rounding : this line's share (in its cost).
    // Whole-taka lines : already inside LineTotal.
    public decimal RoundingShare { get; set; }
    // Exact cost of one unit (free units counted), 4 decimals
    public decimal NetUnitCost { get; set; }
    public decimal ReturnedQuantity { get; set; }
    public string ShortNotes { get; set; } = string.Empty;
}
