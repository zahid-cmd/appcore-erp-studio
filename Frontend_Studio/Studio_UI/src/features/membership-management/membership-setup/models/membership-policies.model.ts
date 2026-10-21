/* ============================================================
   Membership Policy

   The rules of one membership card (one live policy per card) :
   validity, fees, member discounts and free services. No ledgers
   here : fees post to the card's Fee Ledger, discounts to its
   Discount Ledger.

   Free services use FIXED windows of Service Interval (Days /
   Months) from the membership start. A missed window can be given
   later only with approval, up to MaxMissedServices per period and
   until MissedServiceGraceDays after expiry; the other windows
   never move.
============================================================ */

export const INTERVAL_UNITS:
    readonly string[] =
[
    'Days',
    'Months'
];


export interface MembershipPolicy
{
    MembershipPolicyId:
        number;

    // MSP-001
    PolicyCode:
        string;

    // Locked after saving
    MembershipCardId:
        number;

    CardCode:
        string;

    CardName:
        string;

    CardRank:
        number;

    CardIsActive:
        boolean;

    // 1 - 120
    ValidityMonths:
        number;

    // Fees (>= 0)
    EnrollmentFee:
        number;

    RenewalFee:
        number;

    // Discounts (0 - 100)
    SparePartsDiscountPercent:
        number;

    AccessoriesDiscountPercent:
        number;

    ServiceChargeDiscountPercent:
        number;

    // Free Services
    FreeServiceCount:
        number;

    ServiceInterval:
        number;

    // Days / Months ('' when no free services)
    ServiceIntervalUnit:
        string;

    MissedServiceGraceDays:
        number;

    MaxMissedServices:
        number;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Create / Update Membership Policy
============================================================ */

export interface CreateMembershipPolicy
{
    MembershipCardId:
        number;

    ValidityMonths:
        number;

    EnrollmentFee:
        number;

    RenewalFee:
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

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateMembershipPolicy
extends CreateMembershipPolicy
{
    MembershipPolicyId:
        number;
}


/* ============================================================
   Membership card option (cards without a live policy)
============================================================ */

export interface MembershipPolicyCardOption
{
    MembershipCardId:
        number;

    CardCode:
        string;

    CardName:
        string;

    CardRank:
        number;

    IsActive:
        boolean;
}


/* ============================================================
   Membership Policies Defaults
============================================================ */

export interface MembershipPoliciesDefaults
{
    NextPolicyCode:
        string;

    Cards:
        MembershipPolicyCardOption[];

    IntervalUnits:
        string[];
}