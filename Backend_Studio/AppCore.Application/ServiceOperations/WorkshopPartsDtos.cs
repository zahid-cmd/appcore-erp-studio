//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations, the parts of a job card : what the pages
// send and get (Parts Requisitions, Parts Issues, Parts Returns,
// Parts Back-Orders). Days are yyyy-MM-dd.
//===============================================================

// A line of a requisition, an issue or a return
public class PartsLineDto
{
    // The line's own id (0 : not saved)
    public long LineId { get; set; }

    // An issue line : the requisition line it serves.
    // A return line : the issue line it gives back.
    public long? SourceLineId { get; set; }

    // SparePart (spare parts and lubricants) / Accessory
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // A requisition line : issued less returned
    public decimal IssuedQuantity { get; set; }

    // An issue line : what came back
    public decimal ReturnedQuantity { get; set; }

    // An issue / a return line : the FIFO cost
    public decimal Cost { get; set; }

    public string Note { get; set; } = string.Empty;
}


// A requisition, an issue or a return : the list gets the head
// only, one document gets its lines too
public class PartsDocumentDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string DocumentNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string DocumentDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Issues and returns
    public long? WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // The job card
    //-----------------------------------------------------------

    public Guid JobCardPublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    public string JobCardStatus { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BikeNo { get; set; } = string.Empty;

    //-----------------------------------------------------------
    // What it comes from : an issue its requisition, a return
    // its issue
    //-----------------------------------------------------------

    public Guid? SourcePublicId { get; set; }

    public string SourceNo { get; set; } = string.Empty;

    // A requisition : who asks (employee). An issue : who takes
    // the parts (technician)
    public long? PersonId { get; set; }

    public string PersonName { get; set; } = string.Empty;

    // Requisition : Open / Partly Issued / Issued / Closed /
    // Cancelled. Issue, return : Posted
    public string Status { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public decimal TotalCost { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // A requisition nothing was issued for yet
    public bool CanEdit { get; set; }

    // The statuses a requisition can be given from here
    public List<string> NextStatuses { get; set; } = new();

    // An issue : something of it can still come back
    public bool CanReturn { get; set; }

    public List<PartsLineDto> Lines { get; set; } = new();
}


public class SavePartsRequisitionDto
{
    // Needed for a new requisition; ignored afterwards
    public Guid JobCardPublicId { get; set; }

    public string RequisitionDate { get; set; } = string.Empty;

    public long? RequestedByEmployeeId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public List<PartsLineDto> Lines { get; set; } = new();
}


public class PartsStatusChangeDto
{
    // Cancelled / Closed
    public string Status { get; set; } = string.Empty;
}


public class PostPartsIssueDto
{
    public Guid JobCardPublicId { get; set; }

    // null : a direct issue (switch Issue without Requisition)
    public Guid? RequisitionPublicId { get; set; }

    public long WarehouseId { get; set; }

    public string IssueDate { get; set; } = string.Empty;

    public long? WorkshopTechnicianId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // SourceLineId : the requisition line
    public List<PartsLineDto> Lines { get; set; } = new();
}


public class PostPartsReturnDto
{
    public Guid IssuePublicId { get; set; }

    public string ReturnDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // SourceLineId : the issue line
    public List<PartsLineDto> Lines { get; set; } = new();
}


// The stock of an item in a warehouse
public class PartsStockDto
{
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public decimal OnHand { get; set; }
}


// A job card, a requisition or an issue to pick
public class PartsOptionDto
{
    public Guid PublicId { get; set; }

    public string No { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // A requisition, an issue : its job card
    public Guid JobCardPublicId { get; set; }
}


// Every list of the three forms in one call
public class PartsLookupsDto
{
    // yyyy-MM-dd (the business day)
    public string Today { get; set; } = string.Empty;

    public string NextRequisitionNo { get; set; } = string.Empty;

    // Job cards parts can be asked for and issued to
    public List<PartsOptionDto> JobCards { get; set; } = new();

    // Requisitions still waiting for parts
    public List<PartsOptionDto> Requisitions { get; set; } = new();

    // Issues something can still come back of
    public List<PartsOptionDto> Issues { get; set; } = new();

    // Active warehouses (BranchId : their service center)
    public List<WsLookupDto> Warehouses { get; set; } = new();

    public List<WsLookupDto> Employees { get; set; } = new();

    public List<WsLookupDto> Technicians { get; set; } = new();

    public bool IssueWithoutRequisition { get; set; } = true;
}


// A requisition line the service center has not enough stock for
public class PartsBackOrderDto
{
    public string RequisitionNo { get; set; } = string.Empty;

    public Guid RequisitionPublicId { get; set; }

    public string RequisitionDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string JobCardNo { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Requested { get; set; }

    public decimal Issued { get; set; }

    // Requested less issued
    public decimal Waiting { get; set; }

    // In the warehouses of the service center, after the
    // requisitions before this one took theirs
    public decimal Available { get; set; }

    // What must be bought or transferred in
    public decimal Short { get; set; }

    // In the other branches of the company
    public decimal ElsewhereOnHand { get; set; }
}
