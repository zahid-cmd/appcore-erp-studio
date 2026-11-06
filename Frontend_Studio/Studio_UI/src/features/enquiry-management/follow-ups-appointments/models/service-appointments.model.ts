//===============================================================
// Service Appointments page (Follow-ups & Appointments)
//
// A workshop visit booked for an open Service-type enquiry, in a
// slot of the default "Service Appointment" time slot (Enquiry
// Setup › Time Slots). Booked → Confirmed → Arrived, or No-show /
// Cancelled. Booked + Confirmed = live (one per enquiry).
//
// List + form of this page; the day board (Board button) keeps
// enquiry-profiles/models/service-appointments.model.ts.
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for this
// submenu.
//===============================================================

import
{
    PagedQuery
}
from '../../../../shared/paging/paged-result.model';


export type ServiceAppointmentStatus =
    | 'Booked'
    | 'Confirmed'
    | 'Arrived'
    | 'NoShow'
    | 'Cancelled';


export interface FollowUpStatusOption
{
    value:string;
    label:string;
    color:string;
    icon:string;
}


export const SERVICE_APPOINTMENT_STATUSES:
    FollowUpStatusOption[] =
[
    { value:'Booked',    label:'Booked',    color:'#2563EB', icon:'fas fa-calendar-plus' },
    { value:'Confirmed', label:'Confirmed', color:'#0D9488', icon:'fas fa-circle-check' },
    { value:'Arrived',   label:'Arrived',   color:'#16A34A', icon:'fas fa-person-walking-arrow-right' },
    { value:'NoShow',    label:'No-show',   color:'#F59E0B', icon:'fas fa-user-slash' },
    { value:'Cancelled', label:'Cancelled', color:'#DC2626', icon:'fas fa-ban' }
];


// Live and the date has passed
export const OVERDUE_COLOR =
    '#BE123C';


// One appointment (a list row and the form's record)
export interface ServiceAppointmentRow
{
    ServiceAppointmentId:number;
    PublicId:string;
    ServiceEnquiryId:number;
    EnquiryNo:string;
    BranchId:number;
    BranchName:string;
    // yyyy-MM-dd
    AppointmentDate:string;
    // "HH:mm"
    SlotStart:string;
    SlotEnd:string;
    TimeSlotId:number | null;
    Status:ServiceAppointmentStatus;
    StatusDate:string | null;
    CancelReason:string;
    AdvisorUserId:number;
    AdvisorName:string;
    Note:string;
    RescheduleCount:number;
    EnquirerName:string;
    EnquirerMobile:string;
    ModelName:string;
    BrandName:string;
    RegistrationNo:string;
    RequestSummary:string;
    EnquiryStatusName:string;
    EnquiryStatusColor:string;
    CreatedDate:string;
    IsLive:boolean;
    IsOverdue:boolean;

    // Display (filled by the service)
    DateText:string;
    SlotText:string;
    StatusText:string;
    StatusColor:string;
    CustomerText:string;
    BikeText:string;
    MovedText:string;
}


// ?page=&pageSize=&search=&sort=&dir=&period=&status=&branchId=
export interface ServiceAppointmentPageQuery
    extends PagedQuery
{
    // upcoming / today / past / all
    period:string;
    // '' / Live / Overdue / Booked / Confirmed / Arrived / NoShow /
    // Cancelled
    status:string;
    // 0 = every branch
    branchId:number;
}


// One slot of the day
export interface FollowUpSlot
{
    // "HH:mm"
    Start:string;
    End:string;
    Booked:number;
    Capacity:number;
    Full:boolean;
}


// An open Service enquiry with no live appointment (Add)
export interface ServiceAppointmentWaiting
{
    ServiceEnquiryId:number;
    EnquiryNo:string;
    EnquiryDate:string;
    EnquirerName:string;
    EnquirerMobile:string;
    ModelName:string;
    BrandName:string;
    RequestSummary:string;
    PreferredDate:string | null;
    SourceName:string;
    FromWebsite:boolean;
    FromSchedule:boolean;
    ExecutiveUserId:number;
    ExecutiveName:string;
    LastAppointment:string;
}


export interface FollowUpPerson
{
    Id:number;
    Name:string;
}


// GET defaults?date=&branchId=
export interface ServiceAppointmentDefaults
{
    Date:string;
    BranchId:number;
    TimeSlotName:string;
    Capacity:number;
    AllowOverbook:boolean;
    Message:string;
    Slots:FollowUpSlot[];
    Waiting:ServiceAppointmentWaiting[];
    Advisors:FollowUpPerson[];
}


// POST (Add : book)
export interface CreateServiceAppointment
{
    ServiceEnquiryId:number;
    BranchId:number;
    // yyyy-MM-dd
    AppointmentDate:string;
    SlotStart:string;
    AdvisorUserId:number;
    Note:string;
    AllowOverbook:boolean;
}


// PUT {publicId} (Update)
export interface UpdateServiceAppointment
{
    AppointmentDate:string;
    SlotStart:string;
    AdvisorUserId:number;
    Note:string;
    Status:string;
    Reason:string;
    AllowOverbook:boolean;
}
