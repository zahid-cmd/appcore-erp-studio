//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.ProductReceiving;


//===============================================================
// Product Receiving : one received purchase line (its stock
// batch) and where it was placed.
//===============================================================

public abstract class ReceivingLine
{
    public long ReceivingLineId { get; set; }

    public long ReceivingId { get; set; }

    public int LineNo { get; set; }

    public long PurchaseLineId { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public string ProductType { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Purchased (quantity + free) and received before this one
    public decimal PurchasedQuantity { get; set; }

    public decimal ReceivedBefore { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    // Rack · Shelf (Spare Parts / Accessories)
    public long? RackManagementId { get; set; }

    public string RackCode { get; set; } = string.Empty;

    public int ShelfNumber { get; set; }

    // Bin on that shelf (1 .. the shelf's BinCount; 0 = no place)
    public int BinNumber { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}
