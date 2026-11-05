//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.StockMovement;


//===============================================================
// Mass Storing : bulk placement of spare parts / accessories on
// racks and shelves inside ONE warehouse. Location only : no
// quantity change, no stock movement, no journal.
//   One document = one product type (SP / AC).
//   Draft     : saved, edited, deleted, restored freely.
//   Posted    : every line applied at once (the product's
//               location row in the warehouse written, or deleted
//               for "Unplaced").
//   Cancelled : every product's previous location put back (all
//               or nothing).
//===============================================================

public class MassStoring
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long MassStoringId { get; set; }

    // MST-<SP|AC>-0001, given on the first save; one counter per
    // type, never reset, never reused
    public string StoringNo { get; set; } = string.Empty;

    public int SequenceNo { get; set; }

    // SP / AC
    public string PageType { get; set; } = string.Empty;

    public DateOnly StoringDate { get; set; }

    // The warehouse's branch
    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Draft / Posted / Cancelled
    public string Status { get; set; } = "Draft";

    public int LineCount { get; set; }

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

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
// One row per product : its place before (From) and the new one
// (To; null = Unplaced : the location is cleared)
//===============================================================

public class MassStoringLines
{
    public long MassStoringLineId { get; set; }

    public long MassStoringId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    // Snapshot for the view / print
    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // The product's place when saved (draft) / when posted
    // (null = it was unplaced)
    public long? FromRackId { get; set; }

    public int? FromShelfNo { get; set; }

    public int? FromBinNo { get; set; }

    // The new place (null = Unplaced)
    public long? ToRackId { get; set; }

    public int? ToShelfNo { get; set; }

    public int? ToBinNo { get; set; }

    // Stock on hand in the warehouse when saved (display only)
    public decimal StockQuantity { get; set; }

    public string Notes { get; set; } = string.Empty;
}
