//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.ServiceOperations;


//===============================================================
// Service Operations, the workshop : what the pages send and get
// (Workshop Configuration, Job Cards). Days are yyyy-MM-dd; times
// are UTC date-times.
//===============================================================

public class WsLookupDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BranchId { get; set; }
}

public class WsReasonDto
{
    public string Reason { get; set; } = string.Empty;
}


//===============================================================
// Workshop Configuration
//===============================================================

public class WorkshopBayDto
{
    public long WorkshopBayId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

// Bays made in one go : "Service Bay 4", "Service Bay 5" ... after the highest
// bay number of the service center
public class WorkshopBaysCreateDto
{
    // 1 .. 50 bays, in the order they were added on the page
    public List<WorkshopBayNewDto> Bays { get; set; } = new();
}

public class WorkshopBayNewDto
{
    public long BranchId { get; set; }

    public string Remarks { get; set; } = string.Empty;
}

public class WorkshopTechnicianDto
{
    public long WorkshopTechnicianId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Skill { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

public class WorkshopChecklistItemDto
{
    public long WorkshopChecklistItemId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

public class WorkshopSwitchesDto
{
    public bool RequireKm { get; set; } = true;

    public bool RequireChecklist { get; set; }

    // A job card is made from an estimate only (not for Free
    // Service / Warranty / Rework / Internal jobs)
    public bool RequireEstimate { get; set; }

    // The customized service that is the Estimate Charge (null :
    // estimates are free)
    public long? EstimateChargeServiceId { get; set; }

    // Parts can be issued to a job card without a requisition
    public bool IssueWithoutRequisition { get; set; } = true;

    // Parts Issue To Multiple Job Cards : one MIS slip, several
    // job cards
    public bool IssueToMultipleJobs { get; set; }

    // Bulk Parts Issue Per Job : a picked job card brings all its
    // waiting parts (off : part by part)
    public bool IssueBulkPerJob { get; set; }

    // A service invoice can be posted with a due (by a user with
    // the page action Credit Sale)
    public bool AllowCreditInvoice { get; set; }

    // Picking a diagnosis on an estimate puts its labour and parts
    // on the estimate
    public bool DiagnosisSuggests { get; set; }
}

// The whole page in one call
public class WorkshopSetupDto
{
    public List<WorkshopBayDto> Bays { get; set; } = new();

    public List<WorkshopTechnicianDto> Technicians { get; set; } = new();

    public List<WorkshopChecklistItemDto> ChecklistItems { get; set; } = new();

    public WorkshopSwitchesDto Switches { get; set; } = new();

    // Customized services (Service Setup) : one of them is picked
    // as the Estimate Charge. Name carries the rate.
    public List<WsLookupDto> ChargeServices { get; set; } = new();

    public List<WsLookupDto> Branches { get; set; } = new();

    // Active employees (a technician is one of them)
    public List<WsLookupDto> Employees { get; set; } = new();

    // The code the next new record gets (shown on the add form)
    public string NextBayCode { get; set; } = string.Empty;

    public string NextTechnicianCode { get; set; } = string.Empty;

    public string NextChecklistCode { get; set; } = string.Empty;
}


//===============================================================
// Job Cards
//===============================================================

public class JobCardComplaintDto
{
    public string Complaint { get; set; } = string.Empty;
}

// An observation of the opening desk
public class JobCardObservationDto
{
    public long? WorkshopObservationId { get; set; }

    public string Observation { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}

public class JobCardServiceDto
{
    public long JobCardServiceId { get; set; }

    // Scheduled / LaborChart / Customized / Membership / Other
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public bool IsFree { get; set; }

    public string Note { get; set; } = string.Empty;
}

public class JobCardPartDto
{
    public long JobCardPartId { get; set; }

    // SparePart / Accessory / Other
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public string Note { get; set; } = string.Empty;
}

public class JobCardWorkEntryDto
{
    public long JobCardWorkEntryId { get; set; }

    public long WorkshopTechnicianId { get; set; }

    public string TechnicianName { get; set; } = string.Empty;

    public long? WorkshopBayId { get; set; }

    public string BayName { get; set; } = string.Empty;

    public string WorkNote { get; set; } = string.Empty;

    public DateTime StartAt { get; set; }

    // null : still working
    public DateTime? EndAt { get; set; }

    // Whole minutes worked (to now while still working)
    public int Minutes { get; set; }
}

public class JobCardChecklistDto
{
    public long WorkshopChecklistItemId { get; set; }

    public string ItemName { get; set; } = string.Empty;

    // '' (not marked) / OK / Not OK / N/A
    public string Result { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}

public class JobCardStatusDto
{
    public string Status { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public string ChangedByName { get; set; } = string.Empty;

    public DateTime ChangedAt { get; set; }
}

// A job card : the list gets the head only, one card gets it all
public class JobCardDto
{
    public long JobCardId { get; set; }

    public Guid PublicId { get; set; }

    public string JobCardNo { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string JobDate { get; set; } = string.Empty;

    public DateTime CheckInAt { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long? ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    public string FuelLevel { get; set; } = string.Empty;

    public string JobType { get; set; } = string.Empty;

    public long? ServiceVehicleScheduleId { get; set; }

    // "2nd Free Service" ('' : none)
    public string ScheduleName { get; set; } = string.Empty;

    public long? ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public long? AdvisorEmployeeId { get; set; }

    public string AdvisorName { get; set; } = string.Empty;

    public string BasicRequirement { get; set; } = string.Empty;

    public DateTime? PromisedAt { get; set; }

    public bool PickupDrop { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime StatusDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public decimal LabourTotal { get; set; }

    public decimal PartsTotal { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Technicians working on it now (the list)
    public string WorkingNow { get; set; } = string.Empty;

    // The job waits (owner 2026-11-19) : its technician has an
    // earlier job that is not done - the no of that job ("" : it
    // does not wait). A mark only : the status stays as it is.
    public string WaitingBehind { get; set; } = string.Empty;

    // The lines may still be changed (Open / In Progress / Waiting
    // Parts)
    public bool CanEdit { get; set; }

    // The statuses it can go to from here
    public List<string> NextStatuses { get; set; } = new();

    // The stage the card has reached : 1 Opening, 2 Assignment,
    // 3 Work, 4 Closing, 5 Billing, 6 Delivery (0 : cancelled)
    public int StageNo { get; set; }

    // Assignment : the service engineer, the bay, the technicians
    // (the first : the lead)
    public long? ServiceEngineerEmployeeId { get; set; }

    public string ServiceEngineerName { get; set; } = string.Empty;

    public long? WorkshopBayId { get; set; }

    public string BayName { get; set; } = string.Empty;

    public DateTime? AssignedAt { get; set; }

    public List<JobCardTechnicianDto> Technicians { get; set; } = new();

    public string TechnicianNames { get; set; } = string.Empty;

    // The Assignment page : the foreman / supervisor, the technician
    // (an employee), the standard and the allowed time (minutes)
    public long? SupervisorEmployeeId { get; set; }

    public string SupervisorName { get; set; } = string.Empty;

    public long? TechnicianEmployeeId { get; set; }

    public string TechnicianName { get; set; } = string.Empty;

    public int StandardMinutes { get; set; }

    public int AllowedMinutes { get; set; }

    // It can be assigned / assigned again (Open ... Waiting Parts)
    public bool CanAssign { get; set; }

    // Job Card Requirements : its parts and service charges can be
    // allocated (Assigned, Allocated)
    public bool CanAllocate { get; set; }

    // Work, parts and outsourcing can go on (assigned, not done)
    public bool CanWorkOn { get; set; }

    // The tokens given at the opening ('' : none, an Internal job)
    public string WelcomeTokenNo { get; set; } = string.Empty;

    public string DeliveryTokenNo { get; set; } = string.Empty;

    // yyyy-MM-dd ('' : not known)
    public string PurchaseDate { get; set; } = string.Empty;

    public string LastServiceDate { get; set; } = string.Empty;

    public List<JobCardObservationDto> Observations { get; set; } = new();

    // Its live estimate : "EST-000001 v2" ('' : none), Draft / Sent
    // / Approved
    public string EstimateNo { get; set; } = string.Empty;

    public string EstimateStatus { get; set; } = string.Empty;

    public Guid? EstimatePublicId { get; set; }

    // The estimate is approved : the labour and part lines follow
    // it and cannot be changed on the job card
    public bool LinesLocked { get; set; }

    public List<JobCardComplaintDto> Complaints { get; set; } = new();

    public List<JobCardServiceDto> Services { get; set; } = new();

    public List<JobCardPartDto> Parts { get; set; } = new();

    public List<JobCardWorkEntryDto> WorkEntries { get; set; } = new();

    public List<JobCardChecklistDto> Checklist { get; set; } = new();

    public List<JobCardStatusDto> StatusHistory { get; set; } = new();
}

public class SaveJobCardDto
{
    // A service only bike was picked (New Job page) : its brand,
    // model and colour go on the card
    public long? ServiceBikeId { get; set; }

    // yyyy-MM-dd
    public string JobDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    // A Service Vehicle : the bike is read from it. null : the bike
    // is typed (a bike not sold by us)
    public long? ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public int? KmReading { get; set; }

    public string FuelLevel { get; set; } = string.Empty;

    public string JobType { get; set; } = string.Empty;

    public long? ServiceVehicleScheduleId { get; set; }

    public long? ServiceEnquiryId { get; set; }

    public long? AdvisorEmployeeId { get; set; }

    public string BasicRequirement { get; set; } = string.Empty;

    public DateTime? PromisedAt { get; set; }

    public bool PickupDrop { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // A new job card made from an estimate (null : not from one)
    public Guid? EstimatePublicId { get; set; }

    // The New Job page sends these (null : not sent, they stay as
    // they are). yyyy-MM-dd, '' : none.
    public string? PurchaseDate { get; set; }

    public string? LastServiceDate { get; set; }

    public List<JobCardObservationDto>? Observations { get; set; }

    public List<JobCardComplaintDto> Complaints { get; set; } = new();

    public List<JobCardServiceDto> Services { get; set; } = new();

    public List<JobCardPartDto> Parts { get; set; } = new();

    public List<JobCardChecklistDto> Checklist { get; set; } = new();
}

public class JobCardTechnicianDto
{
    public long WorkshopTechnicianId { get; set; }

    public string TechnicianName { get; set; } = string.Empty;

    public bool IsLead { get; set; }
}

// Job Card Assignment : the service engineer, the bay and the
// technicians (the first : the lead)
// Job Card Requirements : the parts and the service charges of a
// job (its projection)
public class SaveJobRequirementDto
{
    // The estimate the lines came from (it then carries the card)
    public Guid? EstimatePublicId { get; set; }

    public List<JobCardServiceDto> Services { get; set; } = new();

    public List<JobCardPartDto> Parts { get; set; } = new();

    public string Note { get; set; } = string.Empty;
}

public class JobRequirementEstimateDto
{
    public Guid PublicId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    // The card was made from it / carries it already
    public bool Linked { get; set; }

    public decimal ChargeTotal { get; set; }

    public bool ChargeCollected { get; set; }

    public List<JobCardServiceDto> Services { get; set; } = new();

    public List<JobCardPartDto> Parts { get; set; } = new();
}

public class JobRequirementDto
{
    public JobCardDto Card { get; set; } = new();

    // The estimate of the job (switch Estimate Driven Job Card on);
    // null : none
    public JobRequirementEstimateDto? Estimate { get; set; }

    // Parts that are with the job now (issued less returned)
    public decimal IssuedQuantity { get; set; }

    // The same, part by part : such a part stays on the requirement
    public List<JobIssuedItemDto> IssuedItems { get; set; } = new();
}

public class JobIssuedItemDto
{
    public string ItemKind { get; set; } = string.Empty;

    public long ItemId { get; set; }

    public decimal Quantity { get; set; }
}

public class AssignJobCardDto
{
    public long? ServiceEngineerEmployeeId { get; set; }

    public long? WorkshopBayId { get; set; }

    public List<long> TechnicianIds { get; set; } = new();

    public string Note { get; set; } = string.Empty;

    // The Assignment page (true) : one technician (an employee), a
    // foreman / supervisor, the services with their standard time,
    // the allowed time and the expected delivery; the bay is not
    // required there
    public bool Simple { get; set; }

    public long? SupervisorEmployeeId { get; set; }

    public long? TechnicianEmployeeId { get; set; }

    public int StandardMinutes { get; set; }

    public int AllowedMinutes { get; set; }

    public DateTime? ExpectedAt { get; set; }

    // null : the services of the card stay
    public List<JobCardServiceDto>? Services { get; set; }
}

// The standard time of a service of the catalogue (Labor Chart,
// Customized Services)
public class ServiceMinutesDto
{
    public string Kind { get; set; } = string.Empty;

    public long Id { get; set; }

    public int Minutes { get; set; }
}

// What the user may do on the job cards (the page actions)
public class JobCardAccessDto
{
    // Opening : a new card (Add), changing it while Open (Update)
    public bool CanOpen { get; set; }

    public bool CanEditOpen { get; set; }

    // Assign Job Card
    public bool CanAssign { get; set; }

    // Job Card Work : the lines, the work and the statuses of an
    // assigned card
    public bool CanWork { get; set; }
}

// The stages of a job card and who may act on them. A stage is
// a page action of Job Cards, given to roles in Activity
// Assignment; every desk is blocked from the other stages.
public static class JobCardStageRules
{
    public const string Open = "Open";

    public const string Assigned = "Assigned";

    public const string Allocated = "Allocated";

    public const string Cancelled = "Cancelled";

    // Job Card Requirements : Add / Update there
    public const string RequirementActivity = "Job Card Requirement";

    public const string RequirementRoute = "/service-operations/%/parts-requisitions";

    public const string AssignActivity = "Assign Job Card";

    public const string WorkActivity = "Job Card Work";

    // The desk pages : a waiting list each. A user of a desk page
    // has its stage without the page action on Job Cards :
    //   Job Card Opening      Add / Update there = opening
    //   Job Card Assignment   Add / Update there = Assign Job Card
    public const string OpeningRoute = "/service-operations/%/job-card-opening";

    public const string AssignmentRoute = "/service-operations/%/job-card-assignment";

    // Changing the card : the opening desk while it is Open, the
    // work desk afterwards
    public static string[] ToEdit(string status) =>
        status == Open ? new[] { "Update" } : new[] { WorkActivity };

    public static string[] ToChangeStatus(string current, string target) =>
        current == Assigned && target == Open ? new[] { AssignActivity }
        : current == Open || current == Cancelled ? new[] { "Update" }
        // the manager cancels an assigned job on Job Card Requirements
        : (current == Assigned || current == Allocated) && target == Cancelled ? new[] { WorkActivity, RequirementActivity }
        : new[] { WorkActivity };
}

public class JobCardStatusChangeDto
{
    public string Status { get; set; } = string.Empty;

    // Needed for Cancelled
    public string Note { get; set; } = string.Empty;
}

public class StartJobCardWorkDto
{
    public long WorkshopTechnicianId { get; set; }

    public long? WorkshopBayId { get; set; }

    public string WorkNote { get; set; } = string.Empty;
}

// A schedule position of a bike that is not taken yet
public class JobCardScheduleOptionDto
{
    public long ServiceVehicleScheduleId { get; set; }

    public long? ScheduledServiceId { get; set; }

    // Free / Paid
    public string ServiceType { get; set; } = string.Empty;

    public string ServiceName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string DueDate { get; set; } = string.Empty;

    public string StatusText { get; set; } = string.Empty;

    public long? ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;
}

// A bike found for a new job card : a Service Vehicle, or a bike of
// an earlier job card (ServiceVehicleId null)
public class JobCardBikeDto
{
    public long? ServiceVehicleId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public int? LastKm { get; set; }

    public bool InWarranty { get; set; }

    // yyyy-MM-dd ('' : not sold by us)
    public string SaleDate { get; set; } = string.Empty;

    // An open job card of the bike ('' : none)
    public string OpenJobCardNo { get; set; } = string.Empty;

    // yyyy-MM-dd : when the bike was bought and serviced last, as
    // far as the service center knows ('' : not known)
    public string PurchaseDate { get; set; } = string.Empty;

    public string LastServiceDate { get; set; } = string.Empty;

    // A customer of Customer Profiles the service center knows no
    // bike of yet : the row carries the customer only
    public bool CustomerOnly { get; set; }

    public List<JobCardScheduleOptionDto> Schedules { get; set; } = new();
}

// Every list of the job card form in one call
// A Motor Bike of Product Settings : one model in one colour
public class JobCardMotorBikeDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    // "<model> - <colour>"
    public string Name { get; set; } = string.Empty;

    // Product Sub Category (the model of the job card); 0 : a
    // service only bike
    public long ModelId { get; set; }

    public string ColorName { get; set; } = string.Empty;

    // A bike we do not sell, added from the New Job page (Id is
    // then the one of the workshop's own list) : its brand and model
    public bool ServiceOnly { get; set; }

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;
}

// New Job page, Add of the Bike section : a bike we do not sell
public class SaveServiceBikeDto
{
    public long BrandManagementId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long ColorManagementId { get; set; }
}

public class JobCardLookupsDto
{
    // yyyy-MM-dd (the business day)
    public string Today { get; set; } = string.Empty;

    public string NextJobCardNo { get; set; } = string.Empty;

    // Service center id : the number the next job card of today
    // gets there (a preview : nothing is reserved)
    public Dictionary<long, string> NextJobCardNos { get; set; } = new();

    // Service center id : the token serial the next job card of
    // today gets there (a service center not in it : 1)
    public Dictionary<long, int> NextTokens { get; set; } = new();

    public List<WsLookupDto> Branches { get; set; } = new();

    // Bike models with their brand
    public List<EnquiryModelOptionDto> Models { get; set; } = new();

    // Motor Bikes (Product Settings) : one model in one colour. The
    // New Job page picks the bike from it - the model and the colour
    // come from the picked one.
    public List<JobCardMotorBikeDto> MotorBikes { get; set; } = new();

    // Brand Management and Color Management (Add of the Bike section)
    public List<WsLookupDto> Brands { get; set; } = new();

    public List<WsLookupDto> Colors { get; set; } = new();

    // Scheduled Services (configured), Labor Chart, Customized and
    // Membership Services (active)
    public List<ServiceItemOptionDto> ServiceItems { get; set; } = new();

    // Active employees (the service advisor)
    public List<WsLookupDto> Employees { get; set; } = new();

    // Active technicians and bays (BranchId : their service center)
    public List<WsLookupDto> Technicians { get; set; } = new();

    public List<WsLookupDto> Bays { get; set; } = new();

    // The employees of the service center departments (the service
    // engineer of an assignment)
    public List<WsLookupDto> Engineers { get; set; } = new();

    // The Assignment page : the standard time of the services, and
    // who is busy - bay id / employee id : the job card that has it
    // (Assigned, In Progress or Waiting Parts)
    public List<ServiceMinutesDto> ServiceMinutes { get; set; } = new();

    public Dictionary<long, string> BusyBays { get; set; } = new();

    public Dictionary<long, string> BusyTechnicians { get; set; } = new();

    // What the user may do (set by the controller)
    public JobCardAccessDto Access { get; set; } = new();

    // The active check-in checklist, in order
    public List<JobCardChecklistDto> Checklist { get; set; } = new();

    public WorkshopSwitchesDto Switches { get; set; } = new();

    public List<string> JobTypes { get; set; } = new();

    public List<string> FuelLevels { get; set; } = new();
}
