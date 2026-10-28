//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Order Lines
//
// One product per line (a product appears once per order).
//   ProductType : Motor Bikes / Spare Parts / Lubricants /
//                 Accessories
//   UnitPrice   : as typed (VAT inclusive or exclusive, see the
//                 header's PriceIncludesVat)
//   Amount      : without VAT ; VatAmount ; LineTotal = payable
//   BilledQuantity : filled by purchase entries (later)
//===============================================================

public class PurchaseOrdersMbLines
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

    public decimal UnitPrice { get; set; }

    public decimal VatRate { get; set; }

    public decimal Amount { get; set; }

    public decimal VatAmount { get; set; }

    public decimal LineTotal { get; set; }

    public decimal BilledQuantity { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}