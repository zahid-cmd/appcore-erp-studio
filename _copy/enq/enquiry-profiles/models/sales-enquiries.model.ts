/* ============================================================
   Sales Enquiries

   Enquiry No ENQ-SAL-MM-YYYY-00001 (server, on the first save;
   one series per month for all branches).
   The enquirer is the person who contacted us (kept by mobile in
   the enquirer list); he may not be the buyer. "No enquiry, no
   sale" : the sale matures the enquiry (Won) later.
============================================================ */

export type EnquiryFor =
    | 'Self'
    | 'Referrer';


export type EnquiryPaymentMode =
    | 'Cash'
    | 'EMI'
    | 'Exchange';


export interface SalesEnquiry
{
    SalesEnquiryId:
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

    // Open / Won / Lost
    StatusStage:
        string;

    InterestLevelId:
        number | null;

    InterestLevelName:
        string;

    InterestLevelColor:
        string;

    // Level taken from the days left to the Expected Purchase
    // Date (open enquiries; refreshed on every read)
    InterestAuto?:
        boolean;

    // Expected Purchase Date − today (open enquiries; 0 = due / past)
    DaysToPurchase?:
        number | null;

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

    EnquiryFor:
        EnquiryFor;

    ModelId:
        number;

    ModelName:
        string;

    BrandName:
        string;

    SecondModelId:
        number | null;

    SecondModelName:
        string;

    Quantity:
        number;

    Budget:
        number;

    PaymentMode:
        EnquiryPaymentMode;

    ExchangeBike:
        string;

    ExpectedPurchaseDate:
        string | null;

    // Colour the enquirer prefers (text only)
    PreferredColor:
        string;

    // Sent from the public website (unassigned while
    // ExecutiveUserId is 0)
    FromWebsite?:
        boolean;

    // Test ride asked for on the website (yyyy-MM-dd, slot)
    TestRideDate?:
        string | null;

    TestRideSlot?:
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

    // Maturity (written by the sale)
    IsMatured:
        boolean;

    MaturedDate:
        string | null;

    SaleNo:
        string;

    CustomerId:
        number | null;

    CustomerName:
        string;

    MaturityDays:
        number | null;
}


/* ============================================================
   Create / Update (number and branch name built by the server)
============================================================ */

export interface CreateSalesEnquiry
{
    EnquiryDate:
        string;

    BranchId:
        number;

    SourceId:
        number;

    StatusId:
        number;

    InterestLevelId:
        number | null;

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

    EnquiryFor:
        EnquiryFor;

    ModelId:
        number;

    SecondModelId:
        number | null;

    Quantity:
        number;

    Budget:
        number;

    PaymentMode:
        EnquiryPaymentMode;

    ExchangeBike:
        string;

    ExpectedPurchaseDate:
        string | null;

    // Optional, text only
    PreferredColor:
        string;

    NextFollowUpDate:
        string | null;

    FollowUpMethodId:
        number | null;

    LostReasonId:
        number | null;

    Remarks:
        string;
}


export interface UpdateSalesEnquiry
extends CreateSalesEnquiry
{
    SalesEnquiryId:
        number;
}


/* ============================================================
   Defaults : next number + every dropdown
============================================================ */

export interface EnquiryOption
{
    Id:
        number;

    Code:
        string;

    Name:
        string;

    ColorCode:
        string;

    Stage:
        string;

    // Interest Level : days to purchase (To null = and more)
    DaysFrom?:
        number | null;

    DaysTo?:
        number | null;

    IsDefault:
        boolean;

    // System row (New / Won / Lost) : New is where an enquiry starts
    IsSystem?:
        boolean;
}


export interface EnquiryModelOption
{
    Id:
        number;

    Code:
        string;

    Name:
        string;

    BrandName:
        string;
}


export interface SalesEnquiriesDefaults
{
    NextEnquiryNo:
        string;

    Sources:
        EnquiryOption[];

    Statuses:
        EnquiryOption[];

    InterestLevels:
        EnquiryOption[];

    FollowUpMethods:
        EnquiryOption[];

    LostReasons:
        EnquiryOption[];

    Models:
        EnquiryModelOption[];

    Executives:
        EnquiryOption[];

    Locations:
        EnquiryOption[];

    // Switches (System Configurations, Sales Enquiries page)
    PurchaseDateRequired:
        boolean;

    AutoInterest:
        boolean;

    CallNoteRequired:
        boolean;
}


/* ============================================================
   Enquirer lookup by mobile
============================================================ */

export interface EnquirerHistory
{
    EnquiryType:
        string;

    EnquiryId:
        number;

    EnquiryNo:
        string;

    EnquiryDate:
        string;

    Subject:
        string;

    StatusName:
        string;

    StatusStage:
        string;
}


export interface EnquirerLookup
{
    Mobile:
        string;

    EnquiryContactId:
        number | null;

    ContactName:
        string;

    AltPhone:
        string;

    LocationId:
        number | null;

    Address:
        string;

    CustomerId:
        number | null;

    CustomerCode:
        string;

    CustomerName:
        string;

    Enquiries:
        EnquirerHistory[];
}
