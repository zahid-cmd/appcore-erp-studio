/* ============================================================
   Service Follow-ups

   A call / visit logged on a service enquiry (the call pop-up
   on the Service Enquiries list and form) : method, outcome,
   note, who and when, and what it changed on the enquiry
   (status, visit date, next follow-up, suspend reason).
============================================================ */

export const SERVICE_FOLLOW_UP_OUTCOMES: string[] =
[
    'Reached',
    'No answer',
    'Call back later',
    'Visit booked',
    'Not interested'
];


export interface ServiceFollowUp
{
    ServiceFollowUpId:number;
    ServiceEnquiryId:number;
    EnquiryNo:string;
    EnquirerName:string;
    EnquirerMobile:string;
    EnquiryType:string;
    // ISO date-time (UTC)
    FollowUpAt:string;
    FollowUpDate:string;
    MethodId:number | null;
    MethodName:string;
    Outcome:string;
    Note:string;
    NextFollowUpDate:string | null;
    StatusFromName:string;
    StatusToName:string;
    StatusToStage:string;
    PreferredDateFrom:string | null;
    PreferredDateTo:string | null;
    LostReasonName:string;
    ExecutiveUserId:number;
    ExecutiveName:string;
}


export interface LogServiceFollowUp
{
    ServiceEnquiryId:number;
    ExecutiveUserId:number;
    MethodId:number | null;
    Outcome:string;
    Note:string;
    // yyyy-MM-dd
    NextFollowUpDate:string | null;
    StatusId:number;
    PreferredDate:string | null;
    LostReasonId:number | null;
}
