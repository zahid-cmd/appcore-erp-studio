//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Service Operations : the parts of a job card (ServiceOperations_
// Parts_Engine.sql; hand-written pages, no Code Sync).
//
// PartsRequisitions       PRQ-000001 : the workshop asks the store.
//                         Open -> Partly Issued -> Issued; Cancelled
// PartsIssues             WPI-<branch>-<FY>-<MM>-00001 : FIFO batches go out of a
//                         warehouse of the service center; the cost
//                         moves to Workshop WIP. Posted at once.
// PartsReturns            WPR-<branch>-<FY>-<MM>-00001 : unused parts of an issue go
//                         back to the same batches
// PartsReturnAllocations  the batch slice each returned quantity
//                         went back to
//===============================================================

public class PartsRequisitions
{
    public long PartsRequisitionId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string RequisitionNo { get; set; } = string.Empty;

    public DateOnly RequisitionDate { get; set; }

    public long BranchId { get; set; }

    public long JobCardId { get; set; }

    public long? RequestedByEmployeeId { get; set; }

    // Open / Partly Issued / Issued / Cancelled
    public string Status { get; set; } = "Open";

    public DateTime StatusDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class PartsRequisitionLines
{
    public long PartsRequisitionLineId { get; set; }

    public long PartsRequisitionId { get; set; }

    public int LineNo { get; set; }

    // SparePart (spare parts and lubricants) / Accessory
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // Issued less returned
    public decimal IssuedQuantity { get; set; }

    public string Note { get; set; } = string.Empty;
}


public class PartsIssues
{
    public long PartsIssueId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string IssueNo { get; set; } = string.Empty;

    // The Material Issue Slip the issue is on (MIS-...); one slip
    // can carry the issues of several job cards. Empty : an issue
    // of before the slips
    public string MisNo { get; set; } = string.Empty;

    public DateOnly IssueDate { get; set; }

    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    public long JobCardId { get; set; }

    public long? PartsRequisitionId { get; set; }

    // Who takes the parts
    public long? WorkshopTechnicianId { get; set; }

    public string Status { get; set; } = "Posted";

    public decimal TotalCost { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}


public class PartsIssueLines
{
    public long PartsIssueLineId { get; set; }

    public long PartsIssueId { get; set; }

    public int LineNo { get; set; }

    public long? PartsRequisitionLineId { get; set; }

    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // FIFO cost of the quantity
    public decimal Cost { get; set; }

    public decimal ReturnedQuantity { get; set; }

    public decimal ReturnedCost { get; set; }

    // The Workshop WIP ledger the cost went to
    public string WipLedgerCode { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}


public class PartsReturns
{
    public long PartsReturnId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string ReturnNo { get; set; } = string.Empty;

    public DateOnly ReturnDate { get; set; }

    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    public long JobCardId { get; set; }

    public long PartsIssueId { get; set; }

    public string Status { get; set; } = "Posted";

    public decimal TotalCost { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}


public class PartsReturnLines
{
    public long PartsReturnLineId { get; set; }

    public long PartsReturnId { get; set; }

    public int LineNo { get; set; }

    public long PartsIssueLineId { get; set; }

    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal Cost { get; set; }

    public string Note { get; set; } = string.Empty;
}


public class PartsReturnAllocations
{
    public long PartsReturnAllocationId { get; set; }

    public long PartsReturnLineId { get; set; }

    public long StockAllocationId { get; set; }

    public long StockBatchId { get; set; }

    public decimal Quantity { get; set; }

    public decimal Value { get; set; }
}
