//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Inventory;


//===============================================================
// Stock batch : one per purchase (or opening) line. Its cost is
// exact; the value depletes and the last unit out takes the
// remainder, so a batch closes at 0.00.
//===============================================================

public class StockBatches
{
    public long StockBatchId { get; set; }
    public string BatchNo { get; set; } = string.Empty;
    // MB / SP / AC
    public string ProductType { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string InventoryLedgerCode { get; set; } = string.Empty;
    // Purchase / Opening
    public string SourceType { get; set; } = string.Empty;
    public long SourceId { get; set; }
    public long SourceLineId { get; set; }
    public string SourceNo { get; set; } = string.Empty;
    public DateOnly SourceDate { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalValue { get; set; }
    public decimal QuantityInTransit { get; set; }
    public decimal QuantityOnHand { get; set; }
    public decimal QuantityOut { get; set; }
    public decimal RemainingValue { get; set; }
    // InTransit / OnHand / Closed / Cancelled
    public string Status { get; set; } = "InTransit";
    public long CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public long? ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
}
