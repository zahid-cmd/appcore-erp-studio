/* ============================================================
   Sales Follow-ups

   A call / visit logged on a sales enquiry : method, outcome,
   note, who and when, and what it changed on the enquiry
   (status, interest, expected purchase date, next follow-up,
   suspend reason). The worklist itself is the open sales
   enquiries.
============================================================ */

export type FollowUpOutcome =
    | 'Reached'
    | 'No answer'
    | 'Call back later'
    | 'Visited showroom'
    | 'Not interested';


export const FOLLOW_UP_OUTCOMES: FollowUpOutcome[] =
[
    'Reached',
    'No answer',
    'Call back later',
    'Visited showroom',
    'Not interested'
];


export interface SalesFollowUp
{
    SalesFollowUpId:number;
    SalesEnquiryId:number;
    EnquiryNo:string;
    EnquirerName:string;
    EnquirerMobile:string;
    ModelName:string;
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
    InterestFromName:string;
    InterestToName:string;
    ExpectedPurchaseFrom:string | null;
    ExpectedPurchaseTo:string | null;
    LostReasonName:string;
    ExecutiveUserId:number;
    ExecutiveName:string;
}


export interface LogSalesFollowUp
{
    SalesEnquiryId:number;
    ExecutiveUserId:number;
    MethodId:number | null;
    Outcome:string;
    Note:string;
    // yyyy-MM-dd
    NextFollowUpDate:string | null;
    StatusId:number;
    InterestLevelId:number | null;
    ExpectedPurchaseDate:string | null;
    LostReasonId:number | null;
}
