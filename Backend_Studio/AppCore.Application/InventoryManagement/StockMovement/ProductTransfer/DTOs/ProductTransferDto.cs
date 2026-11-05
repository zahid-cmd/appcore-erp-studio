//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer : list row
//===============================================================

public class ProductTransferListRowDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long Id { get; set; }

    public string TransferNo { get; set; } = string.Empty;

    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string TransferDate { get; set; } = string.Empty;

    public long FromWarehouseId { get; set; }

    public string FromWarehouseName { get; set; } = string.Empty;

    public long FromBranchId { get; set; }

    public string FromBranchName { get; set; } = string.Empty;

    public long ToWarehouseId { get; set; }

    public string ToWarehouseName { get; set; } = string.Empty;

    public long ToBranchId { get; set; }

    public string ToBranchName { get; set; } = string.Empty;

    public bool IsInterBranch { get; set; }

    // Draft / In Transit / Completed / Received / Cancelled
    public string Status { get; set; } = string.Empty;

    public int LineCount { get; set; }

    public decimal TotalQuantity { get; set; }

    public decimal TotalValue { get; set; }

    public string VoucherNo { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // A deleted draft (shown for Restore)
    public bool IsDeleted { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CreatedDate { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = not received)
    public string ReceiveDate { get; set; } = string.Empty;
}


//===============================================================
// Product Transfer : one document (view / edit / print)
//===============================================================

public class ProductTransferDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long Id { get; set; }

    public long ProductTransferId { get; set; }

    public string TransferNo { get; set; } = string.Empty;

    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string TransferDate { get; set; } = string.Empty;

    public long FromWarehouseId { get; set; }

    public string FromWarehouseCode { get; set; } = string.Empty;

    public string FromWarehouseName { get; set; } = string.Empty;

    public long FromBranchId { get; set; }

    public string FromBranchName { get; set; } = string.Empty;

    public long ToWarehouseId { get; set; }

    public string ToWarehouseCode { get; set; } = string.Empty;

    public string ToWarehouseName { get; set; } = string.Empty;

    public long ToBranchId { get; set; }

    public string ToBranchName { get; set; } = string.Empty;

    public bool IsInterBranch { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int LineCount { get; set; }

    public decimal TotalQuantity { get; set; }

    public decimal TotalValue { get; set; }

    // The journal ('' = none)
    public string VoucherNo { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    // yyyy-MM-dd HH:mm (business time)
    public string CreatedDate { get; set; } = string.Empty;

    public string PostedByName { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    public string ReceivedByName { get; set; } = string.Empty;

    public string ReceivedDate { get; set; } = string.Empty;

    // yyyy-MM-dd (the business date of the receipt)
    public string ReceiveDate { get; set; } = string.Empty;

    public string CancelledByName { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    // What the user may do now
    public bool CanEdit { get; set; }

    public bool CanPost { get; set; }

    // In Transit and the login's branch is the To branch
    public bool CanReceive { get; set; }

    public bool CanCancel { get; set; }

    // Why it cannot be cancelled now ('' = it can, or not posted)
    public string CancelBlockedReason { get; set; } = string.Empty;

    public List<ProductTransferLineDto> Lines { get; set; } = new();
}


//===============================================================
// A line : product, quantity, value, place, batches, bikes
//===============================================================

public class ProductTransferLineDto
{
    public long ProductTransferLineId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitCostAvg { get; set; }

    public decimal Value { get; set; }

    // On hand in the From warehouse now (drafts : for editing)
    public decimal Available { get; set; }

    // SP / AC : place in the To warehouse
    public long? ToRackId { get; set; }

    public string ToRackName { get; set; } = string.Empty;

    public int? ToShelfNo { get; set; }

    // SLF-A-03
    public string ToShelfLabel { get; set; } = string.Empty;

    public int? ToBinNo { get; set; }

    // A-03-05 ('' = not placed)
    public string ToBinCode { get; set; } = string.Empty;

    // "Rack A · A-03-05" ('' = not placed)
    public string Place { get; set; } = string.Empty;

    public bool SavePlace { get; set; }

    public string Notes { get; set; } = string.Empty;

    // MB : the bikes' ids (to edit the draft)
    public List<long> UnitIds { get; set; } = new();

    public List<ProductTransferBatchDto> Batches { get; set; } = new();

    public List<ProductTransferUnitDto> Units { get; set; } = new();
}


public class ProductTransferBatchDto
{
    public long ProductTransferBatchId { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public decimal Value { get; set; }
}


public class ProductTransferUnitDto
{
    public long ProductTransferUnitId { get; set; }

    public long MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;
}


//===============================================================
// Product Transfer list : paged list request
//---------------------------------------------------------------
// GET .../paged?page=1&pageSize=10&search=&sort=&dir=&type=&tab=
//
// Type : SP / LB / AC / MB ... ; empty = every type.
// Tab  : all (default) / a status (draft, posted, ...) / deleted.
// Sort : the list column fields; empty = newest first.
//===============================================================

public class ProductTransferPageRequest : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Type { get; set; }

    public string? Tab { get; set; }
}
