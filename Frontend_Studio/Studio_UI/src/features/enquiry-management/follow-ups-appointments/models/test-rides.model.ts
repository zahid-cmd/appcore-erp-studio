//===============================================================
// Test Rides page (Follow-ups & Appointments)
//
// A test ride booked for an open sales enquiry, in a slot of the
// default "Test Ride" time slot (Enquiry Setup › Time Slots), on
// the enquiry's model or its second model. Booked → Confirmed →
// Ridden, or No-show / Cancelled. Booked + Confirmed = live (one
// per enquiry). Table SalesTestRides.
//
// List + form of this page; the day board (Board button) keeps
// enquiry-profiles/models/sales-test-rides.model.ts.
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

import
{
    FollowUpPerson,
    FollowUpSlot,
    FollowUpStatusOption
}
from './service-appointments.model';


export type TestRideStatus =
    | 'Booked'
    | 'Confirmed'
    | 'Ridden'
    | 'NoShow'
    | 'Cancelled';


export const TEST_RIDE_STATUSES:
    FollowUpStatusOption[] =
[
    { value:'Booked',    label:'Booked',    color:'#2563EB', icon:'fas fa-calendar-plus' },
    { value:'Confirmed', label:'Confirmed', color:'#0D9488', icon:'fas fa-circle-check' },
    { value:'Ridden',    label:'Ridden',    color:'#16A34A', icon:'fas fa-motorcycle' },
    { value:'NoShow',    label:'No-show',   color:'#F59E0B', icon:'fas fa-user-slash' },
    { value:'Cancelled', label:'Cancelled', color:'#DC2626', icon:'fas fa-ban' }
];


export { OVERDUE_COLOR } from './service-appointments.model';

export type { FollowUpPerson, FollowUpSlot } from './service-appointments.model';


// One test ride (a list row and the form's record)
export interface TestRideRow
{
    SalesTestRideId:number;
    PublicId:string;
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
    // The sales executive
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
    IsLive:boolean;
    IsOverdue:boolean;

    // Display (filled by the service)
    DateText:string;
    SlotText:string;
    StatusText:string;
    StatusColor:string;
    CustomerText:string;
    MovedText:string;
}


// ?page=&pageSize=&search=&sort=&dir=&period=&status=&branchId=
export interface TestRidePageQuery
    extends PagedQuery
{
    // upcoming / today / past / all
    period:string;
    // '' / Live / Overdue / Booked / Confirmed / Ridden / NoShow /
    // Cancelled
    status:string;
    // 0 = every branch
    branchId:number;
}


// An open sales enquiry with no live ride (Add)
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
    // Asked for on the enquiry (website included)
    TestRideDate:string | null;
    TestRideSlot:string;
    SourceName:string;
    FromWebsite:boolean;
    InterestLevelName:string;
    InterestLevelColor:string;
    ExecutiveUserId:number;
    ExecutiveName:string;
    LastRide:string;
}


// GET defaults?date=&branchId=
export interface TestRideDefaults
{
    Date:string;
    BranchId:number;
    TimeSlotName:string;
    Capacity:number;
    AllowOverbook:boolean;
    Message:string;
    Slots:FollowUpSlot[];
    Waiting:TestRideWaiting[];
    Advisors:FollowUpPerson[];
}


// POST (Add : book)
export interface CreateTestRide
{
    SalesEnquiryId:number;
    BranchId:number;
    // yyyy-MM-dd
    RideDate:string;
    SlotStart:string;
    // The enquiry's model (0) or its second model
    ModelId:number;
    AdvisorUserId:number;
    Note:string;
    AllowOverbook:boolean;
}


// PUT {publicId} (Update)
export interface UpdateTestRide
{
    RideDate:string;
    SlotStart:string;
    // 0 = keep the bike
    ModelId:number;
    AdvisorUserId:number;
    Note:string;
    Status:string;
    Reason:string;
    AllowOverbook:boolean;
}
