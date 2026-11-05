//===============================================================
// Sales Test Rides (Sales Enquiries › Test Rides page)
//
// A test ride booked for an open sales enquiry in a slot of the
// default "Test Ride" time slot (Enquiry Setup › Time Slots).
// Booked → Confirmed → Ridden, or No-show / Cancelled. Booked +
// Confirmed = live (one per enquiry).
//===============================================================

import { AppointmentSlot } from './service-appointments.model';

export type TestRideStatus =
    | 'Booked'
    | 'Confirmed'
    | 'Ridden'
    | 'NoShow'
    | 'Cancelled';


export const TEST_RIDE_STATUSES:
    { value:TestRideStatus; label:string; color:string; icon:string }[] =
[
    { value:'Booked',    label:'Booked',    color:'#2563EB', icon:'fas fa-calendar-plus' },
    { value:'Confirmed', label:'Confirmed', color:'#0D9488', icon:'fas fa-circle-check' },
    { value:'Ridden',    label:'Ridden',    color:'#16A34A', icon:'fas fa-motorcycle' },
    { value:'NoShow',    label:'No-show',   color:'#F59E0B', icon:'fas fa-user-slash' },
    { value:'Cancelled', label:'Cancelled', color:'#DC2626', icon:'fas fa-ban' }
];


export interface SalesTestRide
{
    SalesTestRideId:number;
    SalesEnquiryId:number;
    EnquiryNo:string;
    BranchId:number;
    BranchName:string;
    // yyyy-MM-dd
    RideDate:string;
    // "HH:mm"
    SlotStart:string;
    SlotEnd:string;
    TimeSlotId:number | null;
    // The bike to ride
    ModelId:number | null;
    ModelName:string;
    Status:TestRideStatus;
    StatusDate:string | null;
    CancelReason:string;
    AdvisorUserId:number;
    AdvisorName:string;
    Note:string;
    RescheduleCount:number;
    EnquirerName:string;
    EnquirerMobile:string;
    EnquiryModelName:string;
    BrandName:string;
    SecondModelName:string;
    InterestLevelName:string;
    InterestLevelColor:string;
    EnquiryStatusName:string;
    EnquiryStatusColor:string;
    CreatedDate:string;
}


export interface TestRideWaiting
{
    SalesEnquiryId:number;
    EnquiryNo:string;
    EnquiryDate:string;
    EnquirerName:string;
    EnquirerMobile:string;
    ModelId:number;
    ModelName:string;
    BrandName:string;
    SecondModelId:number | null;
    SecondModelName:string;
    // Asked for a ride : date + time asked (Morning / 10:30 AM)
    TestRideDate:string | null;
    TestRideSlot:string;
    SourceName:string;
    FromWebsite:boolean;
    InterestLevelName:string;
    InterestLevelColor:string;
    StatusName:string;
    StatusColor:string;
    ExecutiveUserId:number;
    ExecutiveName:string;
    LastRide:string;
}


// Sales Enquiries list › Test Rides view : live rides of every
// date + ride requests not booked yet (website requests included)
export interface ActiveTestRide
{
    // Ride / Request
    Kind:'Ride' | 'Request';
    // 0 for a request
    SalesTestRideId:number;
    SalesEnquiryId:number;
    EnquiryNo:string;
    // yyyy-MM-dd : ride date / asked date
    Date:string;
    SlotStart:string;
    SlotEnd:string;
    // A request : the time asked
    AskedSlot:string;
    // Booked / Confirmed / Requested
    Status:string;
    SourceName:string;
    FromWebsite:boolean;
    EnquirerName:string;
    EnquirerMobile:string;
    ModelName:string;
    BrandName:string;
    InterestLevelName:string;
    InterestLevelColor:string;
    AdvisorName:string;
    Note:string;
    RescheduleCount:number;
}


export interface TestRideDay
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
    // Rides per slot
    Capacity:number;
    Slots:AppointmentSlot[];
    Rides:SalesTestRide[];
    Waiting:TestRideWaiting[];
    Counts:Record<string, number>;
    Week:Record<string, number>;
}


export interface BookTestRide
{
    SalesEnquiryId:number;
    BranchId:number;
    RideDate:string;
    SlotStart:string;
    // The enquiry's model or second model (0 = model)
    ModelId:number;
    AdvisorUserId:number;
    Note:string;
    AllowOverbook?:boolean;
}


export interface RescheduleTestRide
{
    SalesTestRideId:number;
    RideDate:string;
    SlotStart:string;
    Note:string;
    AllowOverbook?:boolean;
}


export interface TestRideStatusChange
{
    SalesTestRideId:number;
    Status:TestRideStatus;
    Reason:string;
}
