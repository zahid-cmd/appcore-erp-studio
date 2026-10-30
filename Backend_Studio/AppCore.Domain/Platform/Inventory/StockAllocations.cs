//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Inventory;


//===============================================================
// Stock allocation : the batch an issue line took, at its cost.
//===============================================================

public class StockAllocations
{
    public long StockAllocationId { get; set; }
    public long StockBatchId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public long DocumentId { get; set; }
    public long DocumentLineId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal Value { get; set; }
    public bool IsReversed { get; set; }
    public long CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}
