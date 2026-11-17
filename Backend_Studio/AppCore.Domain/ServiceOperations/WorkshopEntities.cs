//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Service Operations : the workshop (ServiceOperations_Workshop_
// Engine.sql; hand-written pages, no Code Sync).
//
// WorkshopBays            BAY-0001 : a work bay of a service center
// WorkshopTechnicians     TEC-0001 : an employee who works on job
//                         cards
// WorkshopChecklistItems  CHK-0001 : checked when a bike comes in
// WorkshopConfiguration   one row : the workshop switches
// JobCards                JC-000001 : a bike taken in for work.
//                         Open -> Assigned -> In Progress ->
//                         Waiting Parts -> Work Done -> Ready;
//                         Cancelled. (Invoiced / Delivered come
//                         with Service Invoices.) The stages go
//                         strictly in this order (2026-11-17).
// JobCardTechnicians      the technicians a card is assigned to
//                         (ServiceOperations_JobCard_Stages.sql)
// JobCardComplaints       what the customer says
// JobCardServices         the labour lines
// JobCardParts            the parts the job needs (a list only)
// JobCardWorkEntries      a technician on the job, with time stamps
// JobCardChecklist        the check-in checklist as filled
// JobCardStatusHistory    every status change
//===============================================================

public class WorkshopBays
{
    public long WorkshopBayId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class WorkshopTechnicians
{
    public long WorkshopTechnicianId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    // An employee (Human Resource)
    public long EmployeeId { get; set; }

    // The service center the technician works at
    public long BranchId { get; set; }

    // e.g. Engine, Electrical, General
    public string Skill { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class WorkshopChecklistItems
{
    public long WorkshopChecklistItemId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class WorkshopConfiguration
{
    public long WorkshopConfigurationId { get; set; }

    // A job card cannot be saved without the km reading
    public bool RequireKm { get; set; } = true;

    // Every checklist item must be marked before work starts
    public bool RequireChecklist { get; set; }

    // Work cannot start without an approved estimate
    public bool RequireEstimate { get; set; }

    // Parts can be issued to a job card without a requisition
    public bool IssueWithoutRequisition { get; set; } = true;

    // A service invoice can be posted with a due (by a user with
    // the page action Credit Sale)
    public bool AllowCreditInvoice { get; set; }

    // The customized service that is the Estimate Charge (null :
    // estimates are free)
    public long? EstimateChargeServiceId { get; set; }

    // Picking a diagnosis on an estimate puts its labour and parts
    // on the estimate
    public bool DiagnosisSuggests { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class JobCards
{
    public long JobCardId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // JC-000001
    public string JobCardNo { get; set; } = string.Empty;

    public DateOnly JobDate { get; set; }

    public DateTime CheckInAt { get; set; }

    public long BranchId { get; set; }

    // The bike : a Service Vehicle, or null for a bike typed on the
    // job card (not sold by us)
    public long? ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    // Product Sub Category of a Motor Bikes category (null : typed)
    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    // '' / Empty / Quarter / Half / Three Quarter / Full
    public string FuelLevel { get; set; } = string.Empty;

    // Free Service / Paid Service / General Repair / Warranty /
    // Membership Service / Rework / Internal
    public string JobType { get; set; } = "General Repair";

    // The schedule position a Free / Paid Service takes
    public long? ServiceVehicleScheduleId { get; set; }

    public long? ServiceEnquiryId { get; set; }

    // The service advisor : an employee (Human Resource)
    public long? AdvisorEmployeeId { get; set; }

    // Assignment (stage 2) : the service engineer (an employee),
    // the bay, when and by whom. The technicians :
    // JobCardTechnicians.
    public long? ServiceEngineerEmployeeId { get; set; }

    public long? WorkshopBayId { get; set; }

    public DateTime? AssignedAt { get; set; }

    public long? AssignedBy { get; set; }

    // The Assignment page (2026-11-18) : the foreman / supervisor
    // and the technician (one, an employee for now), the standard
    // time of the picked services and the time allowed for the job
    // (minutes). The expected delivery : PromisedAt.
    public long? SupervisorEmployeeId { get; set; }

    public long? TechnicianEmployeeId { get; set; }

    public int StandardMinutes { get; set; }

    public int AllowedMinutes { get; set; }

    // Opening : the two tokens the customer gets (not on an
    // Internal job). The serial runs by service center and day :
    // Welcome Drink "W-017", Delivery "D-017-4821" (the last four
    // digits are a check code, asked for when the bike leaves).
    public int TokenSerial { get; set; }

    public string WelcomeTokenNo { get; set; } = string.Empty;

    public string DeliveryTokenNo { get; set; } = string.Empty;

    // The bike at the opening : when it was bought, and when it was
    // serviced last. A bike sold by us : from the records; a bike of
    // another showroom : asked from the customer (a new bike, never
    // serviced : the purchase date only).
    public DateOnly? PurchaseDate { get; set; }

    public DateOnly? LastServiceDate { get; set; }

    // What the engineer finds the bike needs
    public string BasicRequirement { get; set; } = string.Empty;

    public DateTime? PromisedAt { get; set; }

    public bool PickupDrop { get; set; }

    // Open / Assigned / In Progress / Waiting Parts / Work Done / Ready /
    // Invoiced / Delivered / Cancelled
    public string Status { get; set; } = "Open";

    public DateTime StatusDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public decimal LabourTotal { get; set; }

    public decimal PartsTotal { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class JobCardComplaints
{
    public long JobCardComplaintId { get; set; }

    public long JobCardId { get; set; }

    public int LineNo { get; set; }

    public string Complaint { get; set; } = string.Empty;
}

// What the opening desk sees on the bike (the observations of
// Workshop Configuration), each with a note
public class JobCardObservations
{
    public long JobCardObservationId { get; set; }

    public long JobCardId { get; set; }

    public int LineNo { get; set; }

    public long? WorkshopObservationId { get; set; }

    public string Observation { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}

// A bike we do not sell (another brand, model or colour), added
// from the New Job page : a brand of Brand Management, a typed
// model, a colour of Color Management. Not a product : no code,
// no ledger, no stock - only the Motor Bike list of the job card.
public class WorkshopServiceBikes
{
    public long WorkshopServiceBikeId { get; set; }

    public long BrandManagementId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long ColorManagementId { get; set; }

    public bool IsDeleted { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}

public class JobCardServices
{
    public long JobCardServiceId { get; set; }

    public long JobCardId { get; set; }

    public int LineNo { get; set; }

    // Scheduled / LaborChart / Customized / Membership / Other
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    // The customer charge (a free scheduled service : 0)
    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    // A free scheduled service : its charge is waived
    public bool IsFree { get; set; }

    public string Note { get; set; } = string.Empty;
}

public class JobCardParts
{
    public long JobCardPartId { get; set; }

    public long JobCardId { get; set; }

    public int LineNo { get; set; }

    // SparePart / Accessory / Other
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    // The price at the time (an estimate)
    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public string Note { get; set; } = string.Empty;
}

public class JobCardWorkEntries
{
    public long JobCardWorkEntryId { get; set; }

    public long JobCardId { get; set; }

    public long WorkshopTechnicianId { get; set; }

    public long? WorkshopBayId { get; set; }

    public string WorkNote { get; set; } = string.Empty;

    public DateTime StartAt { get; set; }

    // null : still working
    public DateTime? EndAt { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}

// A technician the job card is assigned to (the first : the lead)
public class JobCardTechnicians
{
    public long JobCardTechnicianId { get; set; }

    public long JobCardId { get; set; }

    public int LineNo { get; set; }

    public long WorkshopTechnicianId { get; set; }
}

public class JobCardChecklist
{
    public long JobCardChecklistId { get; set; }

    public long JobCardId { get; set; }

    public long WorkshopChecklistItemId { get; set; }

    public int LineNo { get; set; }

    public string ItemName { get; set; } = string.Empty;

    // '' (not marked) / OK / Not OK / N/A
    public string Result { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}

public class JobCardStatusHistory
{
    public long JobCardStatusHistoryId { get; set; }

    public long JobCardId { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public long ChangedBy { get; set; }

    public DateTime ChangedAt { get; set; }
}
