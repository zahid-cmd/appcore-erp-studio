//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer : stock moved from one warehouse to another.
//   One document = one product type (MB / SP / AC).
//   Batch and cost travel unchanged (FIFO batches for SP / AC,
//   the chosen bikes' batches for MB).
//   Same branch   : Draft → Completed (moved at once, no journal)
//   Other branch  : Draft → In Transit (Send : journal TRF,
//                   Dr inventory To branch / Cr inventory From
//                   branch, Inter-Branch lines by the engine)
//                   → Received (on hand in the To warehouse)
//   Cancelled     : movements (and the journal) reversed while
//                   the stock is still where the transfer put it.
//===============================================================

public class ProductTransfer
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long ProductTransferId { get; set; }

    // TRF-<MB|SP|AC>-0001, given on the first save; one counter
    // per type, never reset, never reused
    public string TransferNo { get; set; } = string.Empty;

    public int SequenceNo { get; set; }

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    public DateOnly TransferDate { get; set; }

    public long FromWarehouseId { get; set; }

    // The From warehouse's branch (the journal's branch)
    public long FromBranchId { get; set; }

    public long ToWarehouseId { get; set; }

    public long ToBranchId { get; set; }

    // From and To in different branches : Send → Receive
    public bool IsInterBranch { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Draft / In Transit / Completed / Received / Cancelled
    public string Status { get; set; } = "Draft";

    public int LineCount { get; set; }

    public decimal TotalQuantity { get; set; }

    // At batch cost
    public decimal TotalValue { get; set; }

    // The journal (TRF-<branch>-<FY>-<MM>-00001); '' = none (same
    // branch, or nothing of value)
    public string VoucherNo { get; set; } = string.Empty;

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public long? ReceivedBy { get; set; }

    public DateTime? ReceivedDate { get; set; }

    // The business date the destination received it
    public DateOnly? ReceiveDate { get; set; }

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// One row per product
//===============================================================

public class ProductTransferLines
{
    public long ProductTransferLineId { get; set; }

    public long ProductTransferId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    // The maker's part number (MB : none)
    public string PartNumber { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // MB : the number of bikes
    public decimal Quantity { get; set; }

    // Value ÷ quantity (the batches' costs)
    public decimal UnitCostAvg { get; set; }

    public decimal Value { get; set; }

    // SP / AC : the place in the To warehouse (Rack Management +
    // shelf number 1 … ShelfCount); null = not placed
    public long? ToRackId { get; set; }

    public int? ToShelfNo { get; set; }

    // Bin on that shelf (null = not placed)
    public int? ToBinNo { get; set; }

    // Save the place as the product's location in the To
    // warehouse (on Post for the same branch, on Receive otherwise)
    public bool SavePlace { get; set; }

    public string Notes { get; set; } = string.Empty;
}


//===============================================================
// One row per batch taken (planned FIFO split on a draft, the
// real split once posted)
//===============================================================

public class ProductTransferBatches
{
    public long ProductTransferBatchId { get; set; }

    public long ProductTransferId { get; set; }

    public long ProductTransferLineId { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public decimal Value { get; set; }
}


//===============================================================
// MB : one row per bike (chassis)
//===============================================================

public class ProductTransferUnits
{
    public long ProductTransferUnitId { get; set; }

    public long ProductTransferId { get; set; }

    public long ProductTransferLineId { get; set; }

    public long MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public long StockBatchId { get; set; }
}
