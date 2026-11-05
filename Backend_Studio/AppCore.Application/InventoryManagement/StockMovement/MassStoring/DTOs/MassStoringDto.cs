//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Mass Storing : list row
//===============================================================

public class MassStoringListRowDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long Id { get; set; }

    public string StoringNo { get; set; } = string.Empty;

    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string StoringDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    // Draft / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public int LineCount { get; set; }

    // Lines with a new place / lines set to Unplaced
    public int PlacedCount { get; set; }

    public int ClearedCount { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // A deleted draft (shown for Restore)
    public bool IsDeleted { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string CreatedDate { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;
}


//===============================================================
// Mass Storing : one document (view / edit / print)
//===============================================================

public class MassStoringDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long Id { get; set; }

    public long MassStoringId { get; set; }

    public string StoringNo { get; set; } = string.Empty;

    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string StoringDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int LineCount { get; set; }

    public int PlacedCount { get; set; }

    public int ClearedCount { get; set; }

    public bool IsDeleted { get; set; }

    public string CreatedByName { get; set; } = string.Empty;

    // yyyy-MM-dd HH:mm (business time)
    public string CreatedDate { get; set; } = string.Empty;

    public string PostedByName { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    public string CancelledByName { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public bool CanEdit { get; set; }

    public bool CanPost { get; set; }

    public bool CanCancel { get; set; }

    // Why it cannot be cancelled now ('' = it can, or not posted)
    public string CancelBlockedReason { get; set; } = string.Empty;

    public List<MassStoringLineDto> Lines { get; set; } = new();
}


public class MassStoringLineDto
{
    public long MassStoringLineId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal StockQuantity { get; set; }

    public long? FromRackId { get; set; }

    public string FromRackCode { get; set; } = string.Empty;

    public string FromRackName { get; set; } = string.Empty;

    public int? FromShelfNo { get; set; }

    public string FromShelfLabel { get; set; } = string.Empty;

    public int? FromBinNo { get; set; }

    // A-03-05 ('' = Unplaced)
    public string FromBinCode { get; set; } = string.Empty;

    // "Rack A · A-03-05" ('' = Unplaced)
    public string FromLocation { get; set; } = string.Empty;

    public long? ToRackId { get; set; }

    public string ToRackCode { get; set; } = string.Empty;

    public string ToRackName { get; set; } = string.Empty;

    public int? ToShelfNo { get; set; }

    public string ToShelfLabel { get; set; } = string.Empty;

    public int? ToBinNo { get; set; }

    public string ToBinCode { get; set; } = string.Empty;

    public string ToLocation { get; set; } = string.Empty;

    // The line sets the product to Unplaced
    public bool IsClear { get; set; }

    public string Notes { get; set; } = string.Empty;
}


//===============================================================
// Mass Storing list : paged list request
//---------------------------------------------------------------
// GET .../paged?page=1&pageSize=10&search=&sort=&dir=&type=&tab=
//
// Type : SP / LB / AC / MB ... ; empty = every type.
// Tab  : all (default) / a status (draft, posted, ...) / deleted.
// Sort : the list column fields; empty = newest first.
//===============================================================

public class MassStoringPageRequest : AppCore.Application.Common.Paging.PagedRequest
{
    public string? Type { get; set; }

    public string? Tab { get; set; }
}
