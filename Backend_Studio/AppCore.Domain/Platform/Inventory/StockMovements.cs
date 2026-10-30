//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Inventory;


//===============================================================
// Stock movement : every quantity change of a batch. Stock of a
// warehouse = its OnHand rows (in - out).
//===============================================================

public class StockMovements
{
    public long StockMovementId { get; set; }
    public long StockBatchId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public long BranchId { get; set; }
    public long? WarehouseId { get; set; }
    // InTransit / OnHand
    public string Bucket { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty;
    public decimal QuantityIn { get; set; }
    public decimal QuantityOut { get; set; }
    public decimal UnitCost { get; set; }
    public decimal Value { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public long DocumentId { get; set; }
    public long? DocumentLineId { get; set; }
    public string DocumentNo { get; set; } = string.Empty;
    public DateOnly DocumentDate { get; set; }
    public bool IsReversal { get; set; }
    public string Narration { get; set; } = string.Empty;
    public long CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}
