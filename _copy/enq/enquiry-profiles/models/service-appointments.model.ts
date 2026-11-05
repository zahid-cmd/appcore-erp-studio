//===============================================================
// Service Appointments (Service Enquiries › Appointments page)
//
// A workshop visit booked for an open Service-type enquiry in a
// slot of the default "Service Appointment" time slot (Enquiry
// Setup › Time Slots). Booked → Confirmed → Arrived, or No-show /
// Cancelled. Booked + Confirmed = live (one per enquiry).
//===============================================================

export type AppointmentStatus =
    | 'Booked'
    | 'Confirmed'
    | 'Arrived'
    | 'NoShow'
    | 'Cancelled';


export const APPOINTMENT_STATUSES:
    { value:AppointmentStatus; label:string; color:string; icon:string }[] =
[
    { value:'Booked',    label:'Booked',    color:'#2563EB', icon:'fas fa-calendar-plus' },
    { value:'Confirmed', label:'Confirmed', color:'#0D9488', icon:'fas fa-circle-check' },
    { value:'Arrived',   label:'Arrived',   color:'#16A34A', icon:'fas fa-person-walking-arrow-right' },
    { value:'NoShow',    label:'No-show',   color:'#F59E0B', icon:'fas fa-user-slash' },
    { value:'Cancelled', label:'Cancelled', color:'#DC2626', icon:'fas fa-ban' }
];


export interface ServiceAppointment
{
    ServiceAppointmentId:number;
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
    Status:AppointmentStatus;
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
}


export interface AppointmentWaiting
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
    StatusName:string;
    StatusColor:string;
    ExecutiveUserId:number;
    ExecutiveName:string;
    LastAppointment:string;
}


// Service Enquiries list › Appointments view : live appointments
// of every date + visit requests not booked yet (website
// bookings included)
export interface ActiveAppointment
{
    // Appointment / Request
    Kind:'Appointment' | 'Request';
    // 0 for a request
    ServiceAppointmentId:number;
    ServiceEnquiryId:number;
    EnquiryNo:string;
    // yyyy-MM-dd : appointment date / asked date
    Date:string;
    SlotStart:string;
    SlotEnd:string;
    // Booked / Confirmed / Requested
    Status:string;
    SourceName:string;
    FromWebsite:boolean;
    FromSchedule:boolean;
    EnquirerName:string;
    EnquirerMobile:string;
    ModelName:string;
    BrandName:string;
    RequestSummary:string;
    AdvisorName:string;
    Note:string;
    RescheduleCount:number;
}


export interface AppointmentSlot
{
    Start:string;
    End:string;
    Booked:number;
    // Bookings the slot takes (Time Slot "Bookings per Slot")
    Capacity:number;
    Full:boolean;
}


export interface AppointmentDay
{
    Date:string;
    BranchId:number;
    TimeSlotId:number | null;
    TimeSlotName:string;
    IntervalMinutes:number;
    TimeFrom:string;
    TimeTo:string;
    BreakFrom:string;
    BreakTo:string;
    Message:string;
    // Switch : a full slot may be overbooked after a warning
    AllowOverbook:boolean;
    // Bookings per slot
    Capacity:number;
    Slots:AppointmentSlot[];
    Appointments:ServiceAppointment[];
    Waiting:AppointmentWaiting[];
    Counts:Record<string, number>;
    Week:Record<string, number>;
}


export interface BookServiceAppointment
{
    ServiceEnquiryId:number;
    BranchId:number;
    AppointmentDate:string;
    SlotStart:string;
    AdvisorUserId:number;
    Note:string;
    // Book into a full slot (after a warning)
    AllowOverbook?:boolean;
}


export interface RescheduleServiceAppointment
{
    ServiceAppointmentId:number;
    AppointmentDate:string;
    SlotStart:string;
    Note:string;
    AllowOverbook?:boolean;
}


export interface ServiceAppointmentStatusChange
{
    ServiceAppointmentId:number;
    Status:AppointmentStatus;
    Reason:string;
}
