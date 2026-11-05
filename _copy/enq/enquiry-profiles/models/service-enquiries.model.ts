/* ============================================================
   Service Enquiries

   Service and spare parts enquiries on one page.
   Enquiry No ENQ-SER-MM-YYYY-00001 (server, on the first save;
   one series per month for all branches).
   Service : the bike, services from Service Settings and / or a
   complaint, preferred date + slot, pick-up / drop.
   Parts   : part lines from the Spare Parts / Accessories
   catalogue (or typed).
   Closed (Converted) when the service is taken (job card closed /
   billed) or the parts counter sale is completed.
============================================================ */

import
{
    EnquiryOption,
    EnquirerLookup,
    EnquirerHistory
}
from './sales-enquiries.model';

export type { EnquiryOption, EnquirerLookup, EnquirerHistory };


export type ServiceEnquiryType =
    | 'Service'
    | 'Parts';


export type ServiceLineType =
    | 'Service'
    | 'Part';


// Service : Scheduled / LaborChart / Customized / Membership / Other
// Part    : SparePart / Accessory / Other
export type ServiceItemKind =
    | 'Scheduled'
    | 'LaborChart'
    | 'Customized'
    | 'Membership'
    | 'SparePart'
    | 'Accessory'
    | 'Other';


export interface ServiceEnquiryLine
{
    LineType:
        ServiceLineType;

    ItemKind:
        ServiceItemKind;

    ItemId:
        number | null;

    ItemCode:
        string;

    ItemName:
        string;

    Quantity:
        number;

    Rate:
        number;

    Amount:
        number;

    Note:
        string;
}


export interface ServiceEnquiry
{
    ServiceEnquiryId:
        number;

    EnquiryNo:
        string;

    // yyyy-MM-dd
    EnquiryDate:
        string;

    BranchId:
        number;

    BranchName:
        string;

    EnquiryType:
        ServiceEnquiryType;

    SourceId:
        number;

    SourceName:
        string;

    StatusId:
        number;

    StatusName:
        string;

    StatusColor:
        string;

    // Open / Won / Lost (shown as Suspended)
    StatusStage:
        string;

    // 0 = unassigned (website)
    ExecutiveUserId:
        number;

    ExecutiveName:
        string;

    EnquiryContactId:
        number;

    EnquirerMobile:
        string;

    EnquirerName:
        string;

    AltPhone:
        string;

    LocationId:
        number | null;

    LocationName:
        string;

    Address:
        string;

    ModelId:
        number | null;

    ModelName:
        string;

    BrandManagementId:
        number | null;

    BrandName:
        string;

    RegistrationNo:
        string;

    ChassisNo:
        string;

    KmReading:
        number | null;

    Complaint:
        string;

    PreferredDate:
        string | null;

    // Morning / Afternoon / Evening
    PreferredSlot:
        string;

    PickupDrop:
        boolean;

    EstimatedTotal:
        number;

    Lines:
        ServiceEnquiryLine[];

    // "1st Free Service - Revoo + 2 more"
    RequestSummary:
        string;

    NextFollowUpDate:
        string | null;

    FollowUpMethodId:
        number | null;

    FollowUpMethodName:
        string;

    LastFollowUpDate:
        string | null;

    LastFollowUpNote:
        string;

    LostReasonId:
        number | null;

    LostReasonName:
        string;

    ClosedDate:
        string | null;

    Remarks:
        string;

    FromWebsite:
        boolean;

    // Raised by a sold bike's service schedule
    ServiceVehicleScheduleId:
        number | null;

    IsConverted:
        boolean;

    ConvertedDate:
        string | null;

    // JobCard / ServiceInvoice / CounterSale
    ConvertedDocType:
        string;

    ConvertedDocNo:
        string;
}


/* ============================================================
   Create / Update (number and branch set by the server)
============================================================ */

export interface CreateServiceEnquiry
{
    EnquiryDate:
        string;

    BranchId:
        number;

    EnquiryType:
        ServiceEnquiryType;

    SourceId:
        number;

    StatusId:
        number;

    ExecutiveUserId:
        number;

    EnquirerMobile:
        string;

    EnquirerName:
        string;

    AltPhone:
        string;

    LocationId:
        number | null;

    Address:
        string;

    ModelId:
        number | null;

    RegistrationNo:
        string;

    ChassisNo:
        string;

    KmReading:
        number | null;

    Complaint:
        string;

    PreferredDate:
        string | null;

    PreferredSlot:
        string;

    PickupDrop:
        boolean;

    Lines:
        ServiceEnquiryLine[];

    NextFollowUpDate:
        string | null;

    FollowUpMethodId:
        number | null;

    LostReasonId:
        number | null;

    Remarks:
        string;
}


export interface UpdateServiceEnquiry
extends CreateServiceEnquiry
{
    ServiceEnquiryId:
        number;
}


/* ============================================================
   Defaults : next number + every dropdown
============================================================ */

export interface ServiceModelOption
{
    Id:
        number;

    Code:
        string;

    Name:
        string;

    BrandName:
        string;

    BrandManagementId:
        number | null;
}


export interface ServiceItemOption
{
    // Scheduled / LaborChart / Customized / Membership
    Kind:
        ServiceItemKind;

    Id:
        number;

    Code:
        string;

    Name:
        string;

    // Brand items; null = any brand (dealer services)
    BrandManagementId:
        number | null;

    Rate:
        number;

    IsFree:
        boolean;

    Info:
        string;
}


export interface PartOption
{
    // SparePart / Accessory
    Kind:
        ServiceItemKind;

    Id:
        number;

    Code:
        string;

    PartNumber:
        string;

    Name:
        string;

    Unit:
        string;

    BrandManagementId:
        number | null;

    BrandName:
        string;

    Price:
        number | null;

    OnHand:
        number;
}


export interface ServiceEnquiriesDefaults
{
    NextEnquiryNo:
        string;

    Sources:
        EnquiryOption[];

    Statuses:
        EnquiryOption[];

    FollowUpMethods:
        EnquiryOption[];

    LostReasons:
        EnquiryOption[];

    Models:
        ServiceModelOption[];

    Executives:
        EnquiryOption[];

    Locations:
        EnquiryOption[];

    ServiceItems:
        ServiceItemOption[];

    // Switch : a call needs a note (missing = ON)
    CallNoteRequired:
        boolean;
}



/* ============================================================
   Sold bikes (our outlet) and their service schedule

   Made when a motor bike sale is saved (SaleSource 'Sale') or
   by hand for bikes sold before the ERP ('Manual'). One row per
   service position of the brand's Service Policy; 7 days before
   it is due a Service Enquiry (Source "Scheduled") is raised.
============================================================ */

// Stored : Upcoming / Enquired / Taken / Skipped
// Shown  : Upcoming / Due / Missed / Out of warranty / Enquired /
//          Declined / Enquiry deleted / Taken / Skipped / Stopped
export interface ServiceVehicleSchedule
{
    ServiceVehicleScheduleId:number;
    SequenceNo:number;
    ServiceType:string;
    ServiceName:string;
    ScheduledServiceId:number | null;
    ServiceCode:string;
    CustomerCharge:number;
    IntervalDays:number;
    IntervalKm:number;
    GraceDays:number;
    DueDate:string;
    DueKm:number;
    LastDate:string;
    DueDateEdited:boolean;
    Status:string;
    StatusText:string;
    ServiceEnquiryId:number | null;
    EnquiryNo:string;
    TakenDate:string | null;
    TakenKm:number | null;
    TakenDocType:string;
    TakenDocNo:string;
    Note:string;
}


export interface ServiceVehicle
{
    ServiceVehicleId:number;
    ChassisNo:string;
    EngineNo:string;
    RegistrationNo:string;
    ModelId:number;
    ModelName:string;
    BrandManagementId:number;
    BrandName:string;
    ColorName:string;
    ServicePolicyId:number | null;
    PolicyCode:string;
    WarrantyYears:number;
    WarrantyKm:number;
    WarrantyUntil:string | null;
    InWarranty:boolean;
    SaleDate:string;
    SaleSource:string;
    SaleDocType:string;
    SaleDocId:number | null;
    SaleDocNo:string;
    CustomerId:number | null;
    CustomerCode:string;
    CustomerName:string;
    Mobile:string;
    BranchId:number;
    BranchName:string;
    LastKm:number | null;
    Remarks:string;
    IsActive:boolean;
    TakenCount:number;
    TotalCount:number;
    NextServiceName:string;
    NextDueDate:string | null;
    NextStatusText:string;
    NextEnquiryNo:string;
    Schedules:ServiceVehicleSchedule[];
}


export interface SaveServiceVehicleSchedule
{
    SequenceNo:number;
    DueDate:string | null;
    DueDateEdited:boolean;
    TakenDate:string | null;
    TakenKm:number | null;
    Skipped:boolean;
    Note:string;
}


export interface SaveServiceVehicle
{
    ServiceVehicleId:number;
    BranchId:number;
    ChassisNo:string;
    EngineNo:string;
    RegistrationNo:string;
    ModelId:number;
    ColorName:string;
    SaleDate:string | null;
    Mobile:string;
    CustomerName:string;
    LastKm:number | null;
    Remarks:string;
    IsActive:boolean;
    Schedules:SaveServiceVehicleSchedule[];
}
