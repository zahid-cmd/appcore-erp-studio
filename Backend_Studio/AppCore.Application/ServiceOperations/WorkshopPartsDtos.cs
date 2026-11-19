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

    // An issue : the Material Issue Slip it is on
    public string MisNo { get; set; } = string.Empty;

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


//===============================================================
// The Material Issue Slip (MIS) : the parts allocated to one or
// more job cards (Job Card Requirements) go out of one warehouse
//===============================================================

// A part a job card still waits for
public class MisPartDto
{
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Allocated { get; set; }

    // issued less returned
    public decimal Issued { get; set; }

    public decimal Remaining { get; set; }

    public string Note { get; set; } = string.Empty;

    // rack - shelf - bin in the default warehouse of the service
    // center ("" : not set)
    public string Location { get; set; } = string.Empty;
}

// A job card with parts still to issue
public class MisJobDto
{
    public Guid PublicId { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string JobCardNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BikeNo { get; set; } = string.Empty;

    // 1118004 : the month and the day of the job, then its serial
    public string SerialToken { get; set; } = string.Empty;

    public List<MisPartDto> Parts { get; set; } = new();
}

public class MisLookupsDto
{
    // yyyy-MM-dd (the business day)
    public string Today { get; set; } = string.Empty;

    // The next MIS No of every service center (Id : the service
    // center, Code : its name, Name : the number). A preview : the number is taken
    // when the slip is posted
    public List<WsLookupDto> NextNos { get; set; } = new();

    public List<MisJobDto> Jobs { get; set; } = new();

    public List<WsLookupDto> Warehouses { get; set; } = new();

    public List<WsLookupDto> Technicians { get; set; } = new();

    // Switch Parts Issue To Multiple Job Cards
    public bool MultipleJobs { get; set; }

    // Switch Bulk Parts Issue Per Job
    public bool BulkPerJob { get; set; }
}

public class PostMisJobDto
{
    public Guid JobCardPublicId { get; set; }

    public List<PartsLineDto> Lines { get; set; } = new();
}

public class PostMisDto
{
    public string IssueDate { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public long? WorkshopTechnicianId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public List<PostMisJobDto> Jobs { get; set; } = new();
}

// A slip : its head and the issue of every job card on it
public class MisDto
{
    // The first issue of the slip : the key of the page
    public Guid PublicId { get; set; }

    public string MisNo { get; set; } = string.Empty;

    public string DocumentDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public string PersonName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public int JobCount { get; set; }

    // "JOB-..., JOB-..."
    public string JobText { get; set; } = string.Empty;

    public string CustomerText { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public decimal TotalCost { get; set; }

    public string Status { get; set; } = string.Empty;

    public List<PartsDocumentDto> Jobs { get; set; } = new();
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


//===============================================================
// Location Chart of a job (owner 2026-11-18) : where the parts
// allocated to it sit in the default warehouse of the service
// center - the rack, the shelf and the bin of Rack Management.
// Read only : a pick list for the store.
//===============================================================

// One bin of an item : the zone, the rack, the shelf and the bin
public class PartBinDto
{
    public string Zone { get; set; } = string.Empty;

    // "Rack A"
    public string Rack { get; set; } = string.Empty;

    // "SLF-A-03"
    public string Shelf { get; set; } = string.Empty;

    // "05" : the bin of the shelf
    public string Bin { get; set; } = string.Empty;

    // "A-03-05"
    public string Code { get; set; } = string.Empty;
}

// Where an item sits : "A-03-05", more bins "A-03-05, B-01-02"
public class PartPlaceDto
{
    // bin by bin
    public List<PartBinDto> Bins { get; set; } = new();

    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string Zone { get; set; } = string.Empty;

    public string Rack { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;
}

public class LocationChartLineDto
{
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public string Zone { get; set; } = string.Empty;

    public string Rack { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    // bin by bin
    public List<PartBinDto> Bins { get; set; } = new();

    public decimal Allocated { get; set; }

    public decimal Issued { get; set; }

    public decimal Waiting { get; set; }

    public decimal Stock { get; set; }
}

public class LocationChartDto
{
    public Guid PublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    // 1118004 : the month and the day of the job, then its serial
    public string SerialToken { get; set; } = string.Empty;

    public string JobDate { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string WarehouseName { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BikeNo { get; set; } = string.Empty;

    public string TechnicianName { get; set; } = string.Empty;

    // the allocated parts, in the order of the walk through the store
    public List<LocationChartLineDto> Lines { get; set; } = new();

    // every placed item of the warehouse (the page shows the place
    // of a part before it is saved)
    public List<PartPlaceDto> Places { get; set; } = new();
}



//===============================================================
// Parts Return by job (owner 2026-11-19) : the page works as the
// Parts Issue page - the job card, then its part, with what the job
// was allocated and what it has got. The parts come back of the
// issues of the job, the newest first.
//===============================================================

// A part that sits on a job
public class ReturnPartDto
{
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Allocated { get; set; }

    // all that went out to the job
    public decimal Issued { get; set; }

    // what came back already
    public decimal Returned { get; set; }

    // issued less returned : what can still come back
    public decimal OnJob { get; set; }

    // the unit cost of what sits on the job (the cost it went out
    // at, less what came back, a piece)
    public decimal Rate { get; set; }

    // rack - shelf - bin in the default warehouse of the service
    // center ("" : not set)
    public string Location { get; set; } = string.Empty;
}

// A job card with parts on it
public class ReturnJobDto
{
    public Guid PublicId { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string JobCardNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BikeNo { get; set; } = string.Empty;

    public string SerialToken { get; set; } = string.Empty;

    public List<ReturnPartDto> Parts { get; set; } = new();
}

public class ReturnLookupsDto
{
    // yyyy-MM-dd (the business day)
    public string Today { get; set; } = string.Empty;

    public List<ReturnJobDto> Jobs { get; set; } = new();
}

public class PostJobReturnLineDto
{
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public decimal Quantity { get; set; }
}

public class PostJobReturnDto
{
    public Guid JobCardPublicId { get; set; }

    public List<PostJobReturnLineDto> Lines { get; set; } = new();
}

public class PostJobReturnsDto
{
    public string ReturnDate { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<PostJobReturnDto> Jobs { get; set; } = new();
}
