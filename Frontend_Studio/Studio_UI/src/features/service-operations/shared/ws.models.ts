//===============================================================
// Service Operations, the workshop : models (Workshop
// Configuration, Job Cards). The API answers in camelCase; the
// service turns everything into this PascalCase. Days are
// yyyy-MM-dd; times are ISO date-times (UTC).
//===============================================================

export const WS_EMPTY_GUID =
    '00000000-0000-0000-0000-000000000000';

export interface WsLookup
{
    Id: number;
    Code: string;
    Name: string;
    BranchId: number;
}


//===============================================================
// Workshop Configuration
//===============================================================

export interface WorkshopBay
{
    WorkshopBayId: number;
    PublicId: string;
    Code: string;
    Name: string;
    BranchId: number;
    BranchName: string;
    Remarks: string;
    IsActive: boolean;
}

export interface WorkshopTechnician
{
    WorkshopTechnicianId: number;
    PublicId: string;
    Code: string;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    BranchId: number;
    BranchName: string;
    Skill: string;
    Remarks: string;
    IsActive: boolean;
}

export interface WorkshopChecklistItem
{
    WorkshopChecklistItemId: number;
    PublicId: string;
    Code: string;
    Name: string;
    SortOrder: number;
    Remarks: string;
    IsActive: boolean;
}

export interface WorkshopSwitches
{
    RequireKm: boolean;
    RequireChecklist: boolean;
    // A job card is made from an estimate only
    RequireEstimate: boolean;
    IssueWithoutRequisition: boolean;
    // Parts Issue To Multiple Job Cards : one MIS slip, several jobs
    IssueToMultipleJobs?: boolean;
    // Bulk Parts Issue Per Job : a picked job brings all its parts
    IssueBulkPerJob?: boolean;
    AllowCreditInvoice: boolean;

    // The customized service that is the Estimate Charge (null :
    // estimates are free)
    EstimateChargeServiceId: number | null;

    // Picking a diagnosis on an estimate puts its labour and parts
    // on the estimate
    DiagnosisSuggests?: boolean;
}

// A problem seen on a bike or told by the customer
export interface WorkshopObservation
{
    // the default one (one only) : a new job card and a new estimate
    // start with it
    IsDefault?: boolean;
    WorkshopObservationId: number;
    PublicId: string;
    Code: string;
    Name: string;
    Remarks: string;
    IsActive: boolean;
}

// A labour or a part a diagnosis suggests
export interface WorkshopDiagnosisItem
{
    // Service / Part
    LineType: string;
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Quantity: number;
}

// What was found
export interface WorkshopDiagnosis
{
    WorkshopDiagnosisId: number;
    PublicId: string;
    Code: string;
    Name: string;

    // The observation it explains (null : any)
    WorkshopObservationId: number | null;
    ObservationName: string;
    Remarks: string;
    IsActive: boolean;
    Items: WorkshopDiagnosisItem[];
}

// Workshop Configuration : the tabs Observations and Diagnoses
export interface WorkshopDiagnosisSetup
{
    Observations: WorkshopObservation[];
    Diagnoses: WorkshopDiagnosis[];
    NextObservationCode: string;
    NextDiagnosisCode: string;
    ServiceItems: WsServiceItem[];
    Parts: WsPartOption[];
}

// The estimate form : the active lists
export interface EstimateObservationLists
{
    Observations: WorkshopObservation[];
    Diagnoses: WorkshopDiagnosis[];

    // Switch : a picked diagnosis puts its labour and parts on the
    // estimate
    Suggest: boolean;

    // The user has the page action Add Observation
    CanAdd: boolean;
}

// An observation of an estimate, with what was found
export interface ServiceEstimateObservation
{
    WorkshopObservationId: number | null;
    Observation: string;
    WorkshopDiagnosisId: number | null;
    Diagnosis: string;
    Note: string;
}

export interface WorkshopSetup
{
    Bays: WorkshopBay[];
    Technicians: WorkshopTechnician[];
    ChecklistItems: WorkshopChecklistItem[];
    Switches: WorkshopSwitches;

    // Customized services (Service Setup) : one is the Estimate Charge
    ChargeServices: WsLookup[];
    Branches: WsLookup[];
    Employees: WsLookup[];
    NextBayCode: string;
    NextTechnicianCode: string;
    NextChecklistCode: string;
}


//===============================================================
// Job Cards
//===============================================================

export interface JobCardComplaint
{
    Complaint: string;
}

export interface JobCardService
{
    JobCardServiceId?: number;
    // Scheduled / LaborChart / Customized / Membership / Other
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    Quantity: number;
    Rate: number;
    Amount: number;
    IsFree: boolean;
    Note: string;
}

export interface JobCardPart
{
    JobCardPartId?: number;
    // SparePart / Accessory / Other
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    Quantity: number;
    Rate: number;
    Amount: number;
    Note: string;
}

export interface JobCardWorkEntry
{
    JobCardWorkEntryId: number;
    WorkshopTechnicianId: number;
    TechnicianName: string;
    WorkshopBayId: number | null;
    BayName: string;
    WorkNote: string;
    StartAt: string;
    EndAt: string | null;
    Minutes: number;
}

export interface JobCardChecklistLine
{
    WorkshopChecklistItemId: number;
    ItemName: string;
    // '' / OK / Not OK / N/A
    Result: string;
    Note: string;
}

export interface JobCardStatusLine
{
    Status: string;
    Note: string;
    ChangedAt: string;
}

// An observation of the opening desk (null id : not of the list)
export interface JobCardObservation
{
    WorkshopObservationId: number | null;
    Observation: string;
    Note: string;
}

export interface JobCard
{
    // The Assignment page : the foreman / supervisor, the technician
    // (an employee), the standard and the allowed time (minutes)
    SupervisorEmployeeId?: number | null;
    SupervisorName?: string;
    TechnicianEmployeeId?: number | null;
    TechnicianName?: string;
    StandardMinutes?: number;
    AllowedMinutes?: number;
    JobCardId: number;
    PublicId: string;
    JobCardNo: string;
    JobDate: string;
    CheckInAt: string;
    BranchId: number;
    BranchName: string;
    ServiceVehicleId: number | null;
    ChassisNo: string;
    EngineNo: string;
    RegistrationNo: string;
    ModelId: number | null;
    ModelName: string;
    BrandManagementId: number | null;
    BrandName: string;
    ColorName: string;
    CustomerId: number | null;
    CustomerName: string;
    Mobile: string;
    KmReading: number | null;
    FuelLevel: string;
    JobType: string;
    ServiceVehicleScheduleId: number | null;
    ScheduleName: string;
    ServiceEnquiryId: number | null;
    EnquiryNo: string;
    AdvisorEmployeeId: number | null;
    AdvisorName: string;
    BasicRequirement: string;
    PromisedAt: string | null;
    PickupDrop: boolean;
    Status: string;
    StatusDate: string;
    CancelReason: string;
    LabourTotal: number;
    PartsTotal: number;
    Remarks: string;
    WorkingNow: string;
    // the job waits : the earlier job of its technician ('' : no)
    WaitingBehind?: string;
    CanEdit: boolean;
    NextStatuses: string[];

    // The stage the card has reached : 1 Opening, 2 Assignment,
    // 3 Work, 4 Closing, 5 Billing, 6 Delivery (0 : cancelled)
    StageNo?: number;

    // Assignment : the service engineer, the bay, the technicians
    // (the first : the lead)
    ServiceEngineerEmployeeId?: number | null;
    ServiceEngineerName?: string;
    WorkshopBayId?: number | null;
    BayName?: string;
    AssignedAt?: string | null;

    // The tokens of the customer, given when the card is opened
    // (not for an internal job) : welcome drink, bike delivery
    // yyyy-MM-dd ('' : not known) : bought, serviced last
    PurchaseDate?: string;
    LastServiceDate?: string;

    // What the opening desk saw on the bike
    Observations?: JobCardObservation[];

    WelcomeTokenNo?: string;
    DeliveryTokenNo?: string;
    Technicians?: JobCardTechnician[];
    TechnicianNames?: string;

    // It can be assigned (again); work, parts and outsourcing can
    // go on (assigned, not done)
    CanAssign?: boolean;
    CanWorkOn?: boolean;

    // Job Card Requirements : its parts and service charges can be
    // allocated (Assigned, Allocated)
    CanAllocate?: boolean;

    // The estimate the card was made from ('' : none). LinesLocked is
    // not used any more (always false)
    EstimateNo: string;
    EstimateStatus: string;
    EstimatePublicId: string | null;
    LinesLocked: boolean;

    Complaints: JobCardComplaint[];
    Services: JobCardService[];
    Parts: JobCardPart[];
    WorkEntries: JobCardWorkEntry[];
    Checklist: JobCardChecklistLine[];
    StatusHistory: JobCardStatusLine[];
}

export interface SaveJobCard
{
    // a bike we do not sell was picked (New Job page)
    ServiceBikeId?: number | null;
    // The New Job page sends these (null : not sent)
    PurchaseDate?: string | null;
    LastServiceDate?: string | null;
    Observations?: JobCardObservation[] | null;
    JobDate: string;
    BranchId: number;
    ServiceVehicleId: number | null;
    ChassisNo: string;
    EngineNo: string;
    RegistrationNo: string;
    ModelId: number | null;
    ModelName: string;
    BrandName: string;
    ColorName: string;
    CustomerId: number | null;
    CustomerName: string;
    Mobile: string;
    KmReading: number | null;
    FuelLevel: string;
    JobType: string;
    ServiceVehicleScheduleId: number | null;
    ServiceEnquiryId: number | null;
    AdvisorEmployeeId: number | null;
    BasicRequirement: string;
    PromisedAt: string | null;
    PickupDrop: boolean;
    Remarks: string;

    // A new job card made from an estimate (null : not from one)
    EstimatePublicId: string | null;
    Complaints: JobCardComplaint[];
    Services: JobCardService[];
    Parts: JobCardPart[];
    Checklist: JobCardChecklistLine[];
}

export interface JobCardScheduleOption
{
    ServiceVehicleScheduleId: number;
    ScheduledServiceId: number | null;
    ServiceType: string;
    ServiceName: string;
    DueDate: string;
    StatusText: string;
    ServiceEnquiryId: number | null;
    EnquiryNo: string;
}

export interface JobCardBike
{
    // yyyy-MM-dd ('' : not known)
    PurchaseDate?: string;
    LastServiceDate?: string;

    // a customer of Customer Profiles with no bike here yet
    CustomerOnly?: boolean;
    ServiceVehicleId: number | null;
    ChassisNo: string;
    EngineNo: string;
    RegistrationNo: string;
    ModelId: number | null;
    ModelName: string;
    BrandManagementId: number | null;
    BrandName: string;
    ColorName: string;
    CustomerId: number | null;
    CustomerName: string;
    Mobile: string;
    LastKm: number | null;
    InWarranty: boolean;
    SaleDate: string;
    OpenJobCardNo: string;
    Schedules: JobCardScheduleOption[];
}

export interface JobCardMotorBike
{
    Id: number;
    Code: string;
    // "<model> - <colour>"
    Name: string;
    // the model (Product Sub Category); 0 : a service only bike
    ModelId: number;
    ColorName: string;

    // a bike we do not sell, added from the New Job page (the
    // workshop's own list) : its brand and model
    ServiceOnly?: boolean;
    BrandManagementId?: number | null;
    BrandName?: string;
    ModelName?: string;
}

// What the Assignment page sends
export interface AssignJobCardSimple
{
    Simple: true;
    ServiceEngineerEmployeeId: number;
    SupervisorEmployeeId: number | null;
    TechnicianEmployeeId: number;
    WorkshopBayId: number | null;
    StandardMinutes: number;
    AllowedMinutes: number;
    // the delivery date, the time of the assignment + the allowed time
    ExpectedAt: string;
    // null : the services of the card stay as they are
    Services: { ItemKind: string; ItemId: number }[] | null;
    Note: string;
}

export interface WsModelOption
{
    Id: number;
    Code: string;
    Name: string;
    BrandName: string;
    BrandManagementId: number | null;
}

export interface WsServiceItem
{
    // Scheduled / LaborChart / Customized / Membership
    Kind: string;
    Id: number;
    Code: string;
    Name: string;
    BrandManagementId: number | null;
    Rate: number;
    IsFree: boolean;
    Info: string;
}

// The list of outside works (Workshop Configuration, tab Outside
// Works) : picked on the estimate and the job card
export interface WorkshopOutsideWork
{
    WorkshopOutsideWorkId: number;
    PublicId: string;
    Code: string;
    Name: string;
    // the usual charge to the customer
    Rate: number;
    Remarks: string;
    IsActive: boolean;
}

export interface WorkshopOutsideWorksSetup
{
    OutsideWorks: WorkshopOutsideWork[];
    NextCode: string;
}

// Parts Outsourcing : a part bought from a local vendor for one job
// card (no stock). An outside work done by a vendor is kept the same
// way (ItemKind OutsideWork)
export interface OutsourcedPart
{
    Id: number;
    PublicId: string;
    PurchaseNo: string;
    PurchaseDate: string;
    // SparePart / Accessory / Other (typed) / OutsideWork (ItemId :
    // the work of the list)
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    SupplierId: number | null;
    VendorName: string;
    BillNo: string;
    Quantity: number;
    CostRate: number;
    CostAmount: number;
    Mrp: number | null;
    SellRate: number;
    SellAmount: number;
    // Posted / Cancelled
    Status: string;
    CancelReason: string;
    Note: string;
}

export interface OutsourcedSupplier
{
    SupplierId: number;
    Code: string;
    Name: string;
}

export interface OutsourcedParts
{
    JobCardNo: string;
    CanAdd: boolean;
    // page action Sell Above MRP
    CanAboveMrp: boolean;
    Today: string;
    Suppliers: OutsourcedSupplier[];
    Lines: OutsourcedPart[];
    CostTotal: number;
    SellTotal: number;
}

export interface SaveOutsourcedPart
{
    PurchaseDate: string;
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    SupplierId: number | null;
    VendorName: string;
    BillNo: string;
    Quantity: number;
    CostRate: number;
    SellRate: number;
    Note: string;
}

export interface WsPartOption
{
    // SparePart / Accessory
    Kind: string;
    Id: number;
    Code: string;
    PartNumber: string;
    Name: string;
    Unit: string;
    BrandManagementId: number | null;
    BrandName: string;
    Price: number | null;
    OnHand: number;
}

export interface JobCardTechnician
{
    WorkshopTechnicianId: number;
    TechnicianName: string;
    IsLead: boolean;
}

// What the user may do on the job cards : every stage is a page
// action of Job Cards (Activity Assignment)
export interface JobCardAccess
{
    CanOpen: boolean;
    CanEditOpen: boolean;
    CanAssign: boolean;
    CanWork: boolean;
}

export interface JobCardLookups
{
    Today: string;
    NextJobCardNo: string;

    // service center id : the number the next job card of today
    // gets there (a preview)
    NextJobCardNos?: { [branchId: number]: string };

    // service center id : the token serial the next job card of
    // today gets there
    NextTokens?: { [branchId: number]: number };
    Branches: WsLookup[];
    Models: WsModelOption[];

    // Motor Bikes (one model in one colour) : the New Job page picks
    // the bike from them
    MotorBikes?: JobCardMotorBike[];

    // Brand Management and Color Management (Add of the Bike section)
    Brands?: WsLookup[];
    Colors?: WsLookup[];

    // The Assignment page : the standard time of the services, and
    // who is busy (bay id / employee id : the job card that has it)
    ServiceMinutes?: { Kind: string; Id: number; Minutes: number }[];
    BusyBays?: { [bayId: number]: string };
    BusyTechnicians?: { [employeeId: number]: string };
    ServiceItems: WsServiceItem[];
    Employees: WsLookup[];
    Technicians: WsLookup[];
    Bays: WsLookup[];
    // the employees of the service center departments
    Engineers?: WsLookup[];
    Access?: JobCardAccess;
    Checklist: JobCardChecklistLine[];
    Switches: WorkshopSwitches;
    JobTypes: string[];
    FuelLevels: string[];
}


//===============================================================
// Service Estimates
//===============================================================

export interface ServiceEstimateLine
{
    // Service : Scheduled / LaborChart / Customized / Membership /
    // Other. Part : SparePart / Accessory / Other
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    Quantity: number;
    Rate: number;
    Amount: number;
    IsFree: boolean;
    Note: string;
}

// An estimate is made for a customer and a bike; a job card can be
// made from it afterwards (it is Converted then)
export interface ServiceEstimate
{
    ServiceEstimateId: number;
    PublicId: string;
    EstimateNo: string;
    Version: number;
    EstimateDate: string;
    ValidUntil: string;
    BranchId: number;
    BranchName: string;

    // The customer of the customer profiles (null : typed only)
    CustomerId: number | null;
    CustomerCode: string;
    CustomerName: string;
    Mobile: string;

    // A bike the service center knows (null : typed)
    ServiceVehicleId: number | null;
    ModelId: number | null;
    BrandManagementId: number | null;
    BrandName: string;
    ModelName: string;
    ColorName: string;
    ChassisNo: string;
    EngineNo: string;
    RegistrationNo: string;
    KmReading: number | null;
    BasicRequirement: string;

    // The job card made from it (null : not converted)
    JobCardId: number | null;
    JobCardPublicId: string | null;
    JobCardNo: string;
    JobCardStatus: string;

    // Draft / Sent / Approved / Rejected / Revised / Converted
    Status: string;
    StatusDate: string;
    StatusNote: string;
    LabourTotal: number;
    PartsTotal: number;
    GrandTotal: number;
    Remarks: string;

    // The Estimate Charge (Workshop Configuration). ChargeTotal is
    // what the customer pays (VAT on top of ChargeAmount)
    ChargeName: string;
    ChargeAmount: number;
    ChargeVatRate: number;
    ChargeVatAmount: number;
    ChargeTotal: number;
    ChargeCollected: boolean;
    ChargeCollectedDate: string;
    ChargeReceiptVoucherNo: string;

    // The service invoice the collected charge came off ('' : none)
    ChargeInvoiceNo: string;

    CanEdit: boolean;
    NextStatuses: string[];
    CanRevise: boolean;
    CanCollect: boolean;

    // Only when the charge was collected or a job card was made
    CanPrint: boolean;
    CanConvert: boolean;
    Services: ServiceEstimateLine[];
    Parts: ServiceEstimateLine[];
    Observations?: ServiceEstimateObservation[];
}

export interface SaveServiceEstimate
{
    BranchId: number;
    EstimateDate: string;
    ValidUntil: string;
    CustomerId: number | null;
    CustomerName: string;
    Mobile: string;
    ServiceVehicleId: number | null;
    ChassisNo: string;
    EngineNo: string;
    RegistrationNo: string;
    ModelId: number | null;
    ModelName: string;
    BrandName: string;
    ColorName: string;
    KmReading: number | null;
    BasicRequirement: string;
    Remarks: string;
    Services: ServiceEstimateLine[];
    Parts: ServiceEstimateLine[];
    Observations?: ServiceEstimateObservation[];
}

// The Estimate Charge as Workshop Configuration has it today
export interface EstimateCharge
{
    IsSet: boolean;
    Name: string;
    Amount: number;
    VatRate: number;
    VatAmount: number;
    Total: number;
}

export interface CollectEstimateCharge
{
    CollectDate: string;
    Payments: ServiceInvoicePayment[];
}

export interface ServiceEstimateLookups
{
    Today: string;
    ValidUntil: string;
    NextEstimateNo: string;
    Branches: WsLookup[];
    Models: WsModelOption[];
    ServiceItems: WsServiceItem[];
    Charge: EstimateCharge;
}

// A customer of the customer profiles (the estimate picks one)
export interface WsCustomerOption
{
    CustomerId: number;
    CustomerCode: string;
    Name: string;
    Mobile: string;
}

// EST-000001 for the first version, EST-000001 v2 afterwards
export function wsEstimateName(estimate: { EstimateNo: string; Version: number } | null | undefined): string
{
    if (!estimate)
    {
        return '';
    }

    return (Number(estimate.Version) || 1) > 1 ? `${estimate.EstimateNo} v${estimate.Version}` : (estimate.EstimateNo ?? '');
}


//===============================================================
// Parts Requisitions, Parts Issues, Parts Returns, Parts Back-
// Orders
//===============================================================

export type PartsKind =
    'requisition' | 'issue' | 'return';

// The page of each kind under api/service-operations
export const WS_PARTS_PAGES:
    Record<PartsKind, string> =
{
    requisition:'workshop-management/parts-requisitions',
    issue:'workshop-management/parts-issues',
    return:'workshop-management/parts-returns'
};

export interface PartsLine
{
    LineId: number;

    // An issue line : its requisition line. A return line : its
    // issue line
    SourceLineId: number | null;

    // SparePart (spare parts and lubricants) / Accessory
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Quantity: number;
    IssuedQuantity: number;
    ReturnedQuantity: number;
    Cost: number;
    Note: string;
}

// A requisition, an issue or a return
export interface PartsDocument
{
    Id: number;
    PublicId: string;
    DocumentNo: string;
    DocumentDate: string;
    BranchId: number;
    BranchName: string;
    WarehouseId: number | null;
    WarehouseName: string;
    JobCardPublicId: string;
    JobCardNo: string;
    JobCardStatus: string;
    CustomerName: string;
    Mobile: string;
    ModelName: string;
    BikeNo: string;
    SourcePublicId: string | null;
    SourceNo: string;
    PersonId: number | null;
    PersonName: string;
    Status: string;
    TotalQuantity: number;
    TotalCost: number;
    Remarks: string;
    CanEdit: boolean;
    NextStatuses: string[];
    CanReturn: boolean;
    Lines: PartsLine[];
}

export interface SavePartsRequisition
{
    JobCardPublicId: string;
    RequisitionDate: string;
    RequestedByEmployeeId: number | null;
    Remarks: string;
    Lines: PartsLine[];
}

export interface PostPartsIssue
{
    JobCardPublicId: string;
    RequisitionPublicId: string | null;
    WarehouseId: number;
    IssueDate: string;
    WorkshopTechnicianId: number | null;
    Remarks: string;
    Lines: PartsLine[];
}

export interface PostPartsReturn
{
    IssuePublicId: string;
    ReturnDate: string;
    Remarks: string;
    Lines: PartsLine[];
}

export interface PartsStock
{
    ItemKind: string;
    ItemId: number;
    OnHand: number;
}

export interface PartsOption
{
    PublicId: string;
    No: string;
    Text: string;
    BranchId: number;
    JobCardPublicId: string;
}

export interface PartsLookups
{
    Today: string;
    NextRequisitionNo: string;
    JobCards: PartsOption[];
    Requisitions: PartsOption[];
    Issues: PartsOption[];
    Warehouses: WsLookup[];
    Employees: WsLookup[];
    Technicians: WsLookup[];
    IssueWithoutRequisition: boolean;
}

export interface PartsBackOrder
{
    RequisitionNo: string;
    RequisitionPublicId: string;
    RequisitionDate: string;
    BranchId: number;
    BranchName: string;
    JobCardNo: string;
    CustomerName: string;
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Requested: number;
    Issued: number;
    Waiting: number;
    Available: number;
    Short: number;
    ElsewhereOnHand: number;
}


//===============================================================
// Helpers
//===============================================================

// The dot of a status in a list
export function wsStatusColor(status: string): string
{
    switch (status)
    {
        case 'Active':
        case 'Ready':
        case 'Delivered':
        case 'Approved':
        case 'Issued':
        case 'Posted':
        case 'Settled':
            return '#16a34a';

        case 'Returned':
            return '#dc2626';

        case 'Converted':
            return '#0891b2';

        case 'Open':
        case 'Sent':
            return '#2563eb';

        case 'Draft':
            return '#d97706';

        case 'Rejected':
            return '#dc2626';

        case 'In Progress':
        case 'Partly Issued':
            return '#d97706';

        case 'Assigned':
            return '#2563eb';

        case 'Allocated':
            return '#0891b2';

        case 'Waiting Parts':
            return '#9333ea';

        case 'Work Done':
        case 'Invoiced':
            return '#0d9488';

        case 'Cancelled':
            return '#dc2626';

        default:
            return '#94a3b8';
    }
}

// 12,500.00
export function wsMoney(value: number | null | undefined): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// yyyy-MM-dd -> 15-Nov-2026
export function wsDay(value: string | null | undefined): string
{
    const text = (value ?? '').substring(0, 10);

    const parts = text.split('-');

    if (parts.length !== 3)
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${parts[2]}-${months[Number(parts[1]) - 1] ?? ''}-${parts[0]}`;
}

// ISO date-time -> 15-Nov-2026 02:35 PM (local)
export function wsDateTime(value: string | null | undefined): string
{
    if (!value)
    {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime()))
    {
        return '';
    }

    const pad = (n: number): string => String(n).padStart(2, '0');

    const local =
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    const hour = date.getHours();

    return `${wsDay(local)} ${pad(hour % 12 || 12)}:${pad(date.getMinutes())} ${hour < 12 ? 'AM' : 'PM'}`;
}

// 95 -> 1 h 35 m
export function wsMinutes(value: number | null | undefined): string
{
    const minutes = Math.max(0, Math.round(Number(value) || 0));

    return minutes < 60 ? `${minutes} m` : `${Math.floor(minutes / 60)} h ${minutes % 60} m`;
}


//===============================================================
// Service billing : Service Invoices, Service Returns, Free
// Service Claims
//===============================================================

export const WS_BILLING_PAGES =
{
    // Job Closing : the bill of a job (a service invoice, no money)
    closing:'workshop-management/job-closing',
    invoices:'service-billing/service-invoices',
    returns:'service-billing/service-returns',
    claims:'service-billing/free-service-claims'
};

export interface ServiceInvoiceLine
{
    LineId: number;

    // the place of the line on the bill (1, 2, ...)
    LineNo?: number;

    // Service / Part / Outside
    LineType: string;
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    Quantity: number;
    Rate: number;
    Amount: number;

    // the discount of the line : as typed ("10%" or "50.00") and
    // its amount; VAT is counted on Amount - Discount
    DiscountText?: string;
    Discount?: number;
    IsFree: boolean;
    ClaimAmount: number;
    VatRate: number;
    VatAmount: number;
    Total: number;
    Cost: number;
    Note: string;

    // a part bought outside for the job (set when the job is priced)
    IsOutsourced?: boolean;
}

export interface ServiceInvoicePayment
{
    // Cash / Bank / MFS
    Mode: string;
    LedgerCode: string;
    LedgerName: string;
    Amount: number;
    TransactionRef: string;
}

export interface ServiceInvoice
{
    Id: number;
    PublicId: string;
    InvoiceNo: string;
    InvoiceDate: string;
    BranchId: number;
    BranchName: string;
    JobCardPublicId: string;
    JobCardNo: string;
    JobCardStatus: string;
    JobType: string;
    CustomerCode: string;
    CustomerName: string;
    Mobile: string;
    BrandName: string;
    ModelName: string;
    ChassisNo: string;
    EngineNo: string;
    RegistrationNo: string;
    KmReading: number | null;
    LabourTotal: number;
    PartsTotal: number;
    OutsideTotal: number;
    VatTotal: number;
    // the discount of the bill as a whole (the round off)
    Discount: number;
    // the discounts of the lines, together
    LineDiscount?: number;
    GrandTotal: number;
    PaidAmount: number;
    DueAmount: number;
    PartsCost: number;
    ReceiptVoucherNo: string;
    Status: string;
    IsDelivered: boolean;
    DeliveredAt: string | null;
    ReturnNo: string;
    Remarks: string;
    Warnings: string[];
    CanDeliver: boolean;
    CanReturn: boolean;
    Lines: ServiceInvoiceLine[];
    Payments: ServiceInvoicePayment[];
}

export interface SaveServiceInvoice
{
    JobCardPublicId: string;
    InvoiceDate: string;
    Discount: number;
    Remarks: string;
    Deliver: boolean;

    // ItemName (the work), Note (the vendor), Cost (the vendor's
    // charge), Amount (billed)
    OutsideLines: { ItemName: string; Note: string; Cost: number; Amount: number }[];
    Payments: ServiceInvoicePayment[];

    // the item discount : a percent every charged line takes, and
    // an amount the charged lines absorb by their value
    ItemDiscountPercent?: number;
    ItemDiscountAmount?: number;

    // Job Closing : what became of each complaint and observation
    Findings?: ClosingFinding[];
}

export interface ServiceInvoiceLookups
{
    Today: string;
    JobCards: PartsOption[];
    AllowCredit: boolean;
    CanCredit: boolean;
}

export interface ServiceReturn
{
    Id: number;
    PublicId: string;
    ReturnNo: string;
    ReturnDate: string;
    BranchName: string;
    InvoicePublicId: string;
    InvoiceNo: string;
    InvoiceDate: string;
    JobCardNo: string;
    CustomerName: string;
    Mobile: string;
    Amount: number;
    Reason: string;
    ReceiptCancelled: boolean;
    ReceiptVoucherNo: string;
    PartsReturned: boolean;
    Message: string;
}

export interface PostServiceReturn
{
    InvoicePublicId: string;
    ReturnDate: string;
    Reason: string;
    CancelReceipt: boolean;
    ReturnParts: boolean;
}

export interface FreeServiceClaimLine
{
    LineId: number;
    InvoiceNo: string;
    InvoiceDate: string;
    JobCardNo: string;
    CustomerName: string;
    ChassisNo: string;
    ModelName: string;
    ServiceName: string;
    Amount: number;
}

export interface FreeServiceClaim
{
    Id: number;
    PublicId: string;
    ClaimNo: string;
    ClaimDate: string;
    BrandManagementId: number;
    BrandName: string;
    ServiceCount: number;
    TotalAmount: number;
    Status: string;
    SettledDate: string;
    SettledLedgerCode: string;
    SettledLedgerName: string;
    SettlementNo: string;
    SettlementRef: string;
    Remarks: string;
    Lines: FreeServiceClaimLine[];
}

export interface FreeServiceBrand
{
    BrandManagementId: number;
    BrandName: string;
    ServiceCount: number;
    Amount: number;
}

export interface FreeServiceClaimLookups
{
    Today: string;
    NextClaimNo: string;
    Brands: FreeServiceBrand[];
}

// A ledger of the chart of accounts (platform/accounting/ledgers)
export interface WsLedger
{
    LedgerCode: string;
    LedgerName: string;
    LedgerType: string;
    Branch: string;
    CollectionAccount: boolean;
    IsMoneyLedger: boolean;
    IsActive: boolean;
}


//===============================================================
// Workshop Dashboard and Service Reports (read-only)
//===============================================================

export interface WsReportColumn
{
    Header: string;
    Align: 'left' | 'right' | 'center';
    Width: string;
    // On the page : the small second line under the column of this
    // index, no column of its own (-1 / missing : its own column)
    Under?: number;
    // under another column, as the big figure of a serial token
    Figure?: boolean;
}

// A report : its columns, its rows as ready text, its closing row
export interface WsReport
{
    From: string;
    To: string;
    Branches: WsLookup[];
    Columns: WsReportColumn[];
    Rows: string[][];
    Totals: string[];
    Cut: boolean;
    // A grouped report (Work In Progress : job by job) : the first
    // GroupColumns columns tell the group; GroupTotals : the closing
    // row of every group, in the order the groups come
    GroupColumns?: number;
    GroupTotals?: string[][];
}

export interface WsTile
{
    Label: string;
    Value: string;
    Hint: string;
    Tone: string;
}

export interface WorkshopDashboardJob
{
    PublicId: string;
    JobCardNo: string;
    BranchName: string;
    CustomerName: string;
    Mobile: string;
    ModelName: string;
    BikeNo: string;
    JobType: string;
    Status: string;
    CheckInAt: string | null;
    PromisedAt: string | null;
    IsLate: boolean;
    Technicians: string;
    Bays: string;
}

export interface WorkshopDashboard
{
    Today: string;
    Branches: WsLookup[];
    Tiles: WsTile[];
    Statuses: WsTile[];
    Jobs: WorkshopDashboardJob[];
    Bays: WsTile[];
    // the jobs of the technicians : in hand, waiting
    Queues?: WorkshopQueue[];
    // the service ramps (bays) with their jobs
    Ramps?: WorkshopRamp[];
}

export interface WorkshopRampJob
{
    PublicId: string;
    JobCardNo: string;
    CustomerName: string;
    BikeNo: string;
    ModelName: string;
    Status: string;
    TechnicianName: string;
    Working: boolean;
    PromisedAt: string | null;
    IsLate: boolean;
}

// the first job is on the ramp, the later ones wait for it
export interface WorkshopRamp
{
    Name: string;
    BranchName: string;
    Jobs: WorkshopRampJob[];
}

export interface WorkshopQueueJob
{
    PublicId: string;
    JobCardNo: string;
    CustomerName: string;
    Status: string;
}

export interface WorkshopQueue
{
    TechnicianName: string;
    InHand: WorkshopQueueJob;
    Waiting: WorkshopQueueJob[];
}


//===============================================================
// Job Card Requirements : the parts and the service charges of a
// job (its projection)
//===============================================================

export interface JobRequirementEstimate
{
    PublicId: string;
    Name: string;
    Status: string;
    // the card carries it already
    Linked: boolean;
    ChargeTotal: number;
    ChargeCollected: boolean;
    Services: JobCardService[];
    Parts: JobCardPart[];
}

export interface JobRequirement
{
    Card: JobCard;
    // the estimate of the job (switch Estimate Driven Job Card on)
    Estimate: JobRequirementEstimate | null;
    // parts that are with the job now (issued less returned)
    IssuedQuantity: number;
    // the same, part by part : such a part stays on the requirement
    IssuedItems?: JobIssuedItem[];
}

export interface JobIssuedItem
{
    ItemKind: string;
    ItemId: number;
    Quantity: number;
}

//===============================================================
// The Material Issue Slip (MIS) : the page Parts Issues
//===============================================================

// A part a job card still waits for
export interface MisPart
{
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Allocated: number;
    Issued: number;
    Remaining: number;
    Note: string;
    // rack - shelf - bin in the default warehouse ('' : not set)
    Location?: string;
}

// A job card with parts still to issue
export interface MisJob
{
    PublicId: string;
    BranchId: number;
    BranchName: string;
    JobCardNo: string;
    Status: string;
    CustomerName: string;
    Mobile: string;
    ModelName: string;
    BikeNo: string;
    // 1118004 : the month and the day of the job, then its serial
    SerialToken?: string;
    Parts: MisPart[];
}

export interface MisLookups
{
    Today: string;
    // Id : the service center, Code : its name, Name : its next MIS No
    NextNos: WsLookup[];
    Jobs: MisJob[];
    Warehouses: WsLookup[];
    Technicians: WsLookup[];
    // switch Parts Issue To Multiple Job Cards
    MultipleJobs: boolean;
    // switch Bulk Parts Issue Per Job
    BulkPerJob: boolean;
}

export interface PostMis
{
    IssueDate: string;
    WarehouseId: number;
    WorkshopTechnicianId: number | null;
    Remarks: string;
    Jobs: { JobCardPublicId: string; Lines: PartsLine[] }[];
}

// A slip : its head and the issue of every job card on it
export interface Mis
{
    PublicId: string;
    MisNo: string;
    DocumentDate: string;
    BranchId: number;
    BranchName: string;
    WarehouseName: string;
    PersonName: string;
    Remarks: string;
    JobCount: number;
    JobText: string;
    CustomerText: string;
    TotalQuantity: number;
    TotalCost: number;
    Status: string;
    Jobs: PartsDocument[];
}

// One bin of an item
export interface PartBin
{
    Zone: string;
    // "Rack A"
    Rack: string;
    // "SLF-A-03"
    Shelf: string;
    // "05"
    Bin: string;
    // "A-03-05"
    Code: string;
}

// Location Chart of a job : where its parts sit (Rack Management)
export interface PartPlace
{
    Bins?: PartBin[];
    ItemKind: string;
    ItemId: number;
    Zone: string;
    Rack: string;
    // "A-03-05"; more bins : "A-03-05, B-01-02"
    Location: string;
}

export interface LocationChartLine
{
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Zone: string;
    Rack: string;
    Location: string;
    Bins?: PartBin[];
    Allocated: number;
    Issued: number;
    Waiting: number;
    Stock: number;
}

export interface LocationChart
{
    PublicId: string;
    JobCardNo: string;
    SerialToken: string;
    JobDate: string;
    Status: string;
    BranchId: number;
    BranchName: string;
    WarehouseName: string;
    CustomerName: string;
    Mobile: string;
    ModelName: string;
    BikeNo: string;
    TechnicianName: string;
    Lines: LocationChartLine[];
    // every placed item of the warehouse
    Places: PartPlace[];
    // the chart of a posted slip : its MIS No (the lines are then
    // what the slip issued, in Waiting). Set by the print only
    MisNo?: string;
}

export interface SaveJobRequirement
{
    EstimatePublicId: string | null;
    Services: JobCardService[];
    Parts: JobCardPart[];
    Note: string;
}


//===============================================================
// Parts Return by job (owner 2026-11-19)
//===============================================================

// A part that sits on a job
export interface ReturnPart
{
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Allocated: number;
    Issued: number;
    Returned: number;
    // issued less returned : what can still come back
    OnJob: number;
    // the unit cost of what sits on the job
    Rate: number;
    // rack - shelf - bin in the default warehouse ('' : not set)
    Location?: string;
}

// A job card with parts on it
export interface ReturnJob
{
    PublicId: string;
    BranchId: number;
    BranchName: string;
    JobCardNo: string;
    Status: string;
    CustomerName: string;
    ModelName: string;
    BikeNo: string;
    SerialToken: string;
    Parts: ReturnPart[];
}

export interface ReturnLookups
{
    Today: string;
    Jobs: ReturnJob[];
}

export interface PostJobReturns
{
    ReturnDate: string;
    Remarks: string;
    Jobs: { JobCardPublicId: string; Lines: { ItemKind: string; ItemId: number; Quantity: number }[] }[];
}

// The hover text of a part row : where it sits in the store
export function wsPlaceTitle(location: string | null | undefined): string
{
    const place = String(location ?? '').trim();

    // in full : zone, rack, shelf, bin - a bin a line
    return place ? `Location\n${place}` : 'Location : not set in Rack Management';
}

// A bin in full : "Zone : A   |   Rack : Rack A   |   Shelf : SLF-A-03   |   Bin : 05"
export function wsBinText(bin: PartBin): string
{
    return [
        bin.Zone ? `Zone : ${bin.Zone}` : '',
        bin.Rack ? `Rack : ${bin.Rack}` : '',
        bin.Shelf ? `Shelf : ${bin.Shelf}` : '',
        bin.Bin ? `Bin : ${bin.Bin}` : ''
    ].filter(x => !!x).join('   |   ');
}


//===============================================================
// Job Closing (owner 2026-11-19) : stage 4 of a job card
//===============================================================

// A job in work that can be closed
export interface ClosingJob
{
    PublicId: string;
    BranchId: number;
    BranchName: string;
    JobCardNo: string;
    JobDate: string;
    Status: string;
    JobType: string;
    CustomerName: string;
    Mobile: string;
    ModelName: string;
    BikeNo: string;
    SerialToken: string;
    // allocated and not issued : left out of the bill
    UnissuedParts: number;
    UnissuedQuantity: number;
}

export interface ClosingLookups
{
    Today: string;
    Jobs: ClosingJob[];
}

// A complaint of the customer or an observation of the opening desk,
// with what became of it
export interface ClosingFinding
{
    // Complaint / Observation
    Kind: string;
    Id: number;
    Text: string;
    Note: string;
    // '' / Solved / Needs Further Work / Not Done
    Result: string;
    ResultNote: string;
}

export interface ClosingPart
{
    ItemKind: string;
    ItemCode: string;
    ItemName: string;
    Allocated: number;
    Issued: number;
    Returned: number;
    // issued less returned : what is billed
    OnJob: number;
    // allocated and not on the job : left out of the bill
    Remaining: number;
    Rate: number;
}

// A line of a parts issue or of a parts return of the job
export interface ClosingMove
{
    DocNo: string;
    // an issue : its slip. A return : the issue it came from
    RefNo: string;
    Date: string;
    ItemCode: string;
    ItemName: string;
    Quantity: number;
    Returned: number;
    Cost: number;
}

// An outside work (Kind Work) or a part bought outside (Kind Part)
export interface ClosingOutsourced
{
    Kind: string;
    DocNo: string;
    Date: string;
    ItemCode: string;
    ItemName: string;
    VendorName: string;
    BillNo: string;
    Quantity: number;
    Cost: number;
    Amount: number;
}

// The page Job Outsourcing : a job in work and what is outsourced
// for it so far (the posted entries)
export interface OutsourcingJob
{
    PublicId: string;
    BranchId: number;
    BranchName: string;
    JobCardNo: string;
    JobDate: string;
    Status: string;
    JobType: string;
    CustomerName: string;
    Mobile: string;
    ModelName: string;
    BikeNo: string;
    SerialToken: string;
    Entries: number;
    CostTotal: number;
    SellTotal: number;
}

export interface OutsourcingJobs
{
    Today: string;
    Jobs: OutsourcingJob[];
}

// The whole job before it is closed
export interface ClosingDetail
{
    Card: JobCard | null;
    Parts: ClosingPart[];
    Issues: ClosingMove[];
    Returns: ClosingMove[];
    Findings: ClosingFinding[];
    Outsourced?: ClosingOutsourced[];
}
