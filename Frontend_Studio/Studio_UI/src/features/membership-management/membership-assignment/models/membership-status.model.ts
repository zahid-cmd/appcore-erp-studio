/* ============================================================
   Membership (Membership Status page)

   One membership period of one bike, for an Inbound or Outside
   customer. The card's active policy is copied at enrollment.
   Pending until Membership Fees Collection collects the fee
   (Active at once when the fee is 0); Expired automatically after
   the expiry date.

   Free services : fixed windows from the start date, one service
   per window. Missed windows can be given later only when
   approved (until expiry + grace days, up to the maximum).
   Dates are "yyyy-MM-dd".
============================================================ */

export const MEMBERSHIP_STATUSES:
    readonly string[] =
[
    'Pending',
    'Active',
    'Expired',
    'Suspended',
    'Cancelled',
    'Renewed',
    'Upgraded'
];


export interface MembershipServiceWindow
{
    MembershipServiceWindowId:
        number;

    WindowNo:
        number;

    FromDate:
        string;

    ToDate:
        string;

    IsCarriedOver:
        boolean;

    // Upcoming / Available / Used / Missed / Approved
    State:
        string;

    UsedDate:
        string;

    UsedReference:
        string;

    IsApproved:
        boolean;

    ApprovedDate:
        string;

    ApprovalReason:
        string;

    CanUse:
        boolean;

    CanUndo:
        boolean;

    CanApprove:
        boolean;
}


export interface Membership
{
    MembershipId:
        number;

    // MEM-000001
    MembershipNo:
        string;

    // Enrollment / Renewal / Upgrade
    EntryType:
        string;

    MembershipCardId:
        number;

    MembershipPolicyId:
        number;

    CustomerId:
        number;

    // Display
    CardCode:
        string;

    CardName:
        string;

    PolicyCode:
        string;

    CustomerCode:
        string;

    CustomerName:
        string;

    CustomerType:
        string;

    MotorBikeName:
        string;

    UsedCount:
        number;

    MissedCount:
        number;

    ApprovedCount:
        number;

    // Pending : every field can change
    IsEditable:
        boolean;

    Windows:
        MembershipServiceWindow[];

    // Motor Bike (Customer Vehicle linked later)
    CustomerVehicleId:
        number | null;

    MotorBikeId:
        number;

    ChassisNo:
        string;

    EngineNo:
        string;

    // Period & Fee
    EnrollmentDate:
        string;

    StartDate:
        string;

    ExpiryDate:
        string;

    FeeAmount:
        number;

    FeeCollected:
        boolean;

    // Policy values copied at enrollment
    ValidityMonths:
        number;

    SparePartsDiscountPercent:
        number;

    AccessoriesDiscountPercent:
        number;

    ServiceChargeDiscountPercent:
        number;

    FreeServiceCount:
        number;

    CarriedServiceCount:
        number;

    ServiceInterval:
        number;

    ServiceIntervalUnit:
        string;

    MissedServiceGraceDays:
        number;

    MaxMissedServices:
        number;

    // Status
    Status:
        string;

    StatusReason:
        string;

    StatusDate:
        string;

    Remarks:
        string;
}


/* ============================================================
   Create (Enroll) / Update
============================================================ */

export interface CreateMembership
{
    MembershipCardId:
        number;

    CustomerId:
        number;

    MotorBikeId:
        number;

    ChassisNo:
        string;

    EngineNo:
        string;

    EnrollmentDate:
        string;

    StartDate:
        string;

    Remarks:
        string;
}


export interface UpdateMembership
extends CreateMembership
{
    MembershipId:
        number;

    Status:
        string;

    StatusReason:
        string;
}


/* ============================================================
   Options (defaults)
============================================================ */

export interface MembershipCardOption
{
    MembershipCardId:
        number;

    CardCode:
        string;

    CardName:
        string;

    CardRank:
        number;

    MembershipPolicyId:
        number;

    PolicyCode:
        string;

    ValidityMonths:
        number;

    EnrollmentFee:
        number;

    SparePartsDiscountPercent:
        number;

    AccessoriesDiscountPercent:
        number;

    ServiceChargeDiscountPercent:
        number;

    FreeServiceCount:
        number;

    ServiceInterval:
        number;

    ServiceIntervalUnit:
        string;

    MissedServiceGraceDays:
        number;

    MaxMissedServices:
        number;
}


export interface MembershipCustomerOption
{
    CustomerId:
        number;

    CustomerCode:
        string;

    DisplayName:
        string;

    CustomerType:
        string;
}


export interface MembershipMotorBikeOption
{
    MotorBikeId:
        number;

    ProductCode:
        string;

    ProductName:
        string;
}


export interface MembershipStatusDefaults
{
    NextMembershipNo:
        string;

    // Server date "yyyy-MM-dd"
    Today:
        string;

    Cards:
        MembershipCardOption[];

    Customers:
        MembershipCustomerOption[];

    MotorBikes:
        MembershipMotorBikeOption[];

    Statuses:
        string[];
}