/* ============================================================
   Constants
============================================================ */

export const SERVICE_TYPES:
    readonly string[] =
[
    'Free',
    'Paid'
];

// Warranty is kept in years (industry standard); 1 year = 365
// days, as the server uses for the free service check
export const DAYS_PER_YEAR:
    number =
    365;


/* ============================================================
   Service Policy Schedule (one service position)
   Due IntervalDays after the previous service (row 1 : after
   the sale date). Km is reference only.
============================================================ */

export interface ServicePolicySchedule
{
    ServicePolicyScheduleId:
        number;

    SequenceNo:
        number;

    // Free / Paid
    ServiceType:
        string;

    ServiceTypeNo:
        number;

    // e.g. "4th Free Service"
    ServiceName:
        string;

    IntervalDays:
        number;

    IntervalKm:
        number;

    GraceDays:
        number;
}


/* ============================================================
   Service Policy
   One policy per brand, declared first (only brands with a
   policy can get a Brand Services category). Holds the warranty
   limit for free services and the required schedule template.
============================================================ */

export interface ServicePolicy
{
    ServicePolicyId:
        number;

    PolicyCode:
        string;

    //===========================================================
    // Brand
    //===========================================================

    BrandManagementId:
        number;

    BrandName?:
        string;

    //===========================================================
    // Warranty Limit (free services only)
    //===========================================================

    // Years (industry standard)
    WarrantyYears:
        number;

    WarrantyKm:
        number;

    //===========================================================
    // Schedule (+ counts taken from it)
    //===========================================================

    FreeServiceCount:
        number;

    PaidServiceCount:
        number;

    Schedules:
        ServicePolicySchedule[];

    //===========================================================
    // Associated Ledger (free service claim receivable)
    // Name = "<Sub Group Name> - <Brand Name>", built live
    //===========================================================

    AssociatedSubGroupId:
        number;

    AssociatedSubGroupCode?:
        string;

    AssociatedSubGroupName?:
        string;

    AssociatedLedgerCode:
        string;

    AssociatedLedgerName:
        string;

    //===========================================================
    // Configuration / Status
    //===========================================================

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Create / Update
============================================================ */

export interface CreateServicePolicy
{
    PolicyCode:
        string;

    BrandManagementId:
        number;

    WarrantyYears:
        number;

    WarrantyKm:
        number;

    FreeServiceCount:
        number;

    PaidServiceCount:
        number;

    Schedules:
        ServicePolicySchedule[];

    AssociatedSubGroupId:
        number;

    AssociatedLedgerCode:
        string;

    AssociatedLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateServicePolicy
extends CreateServicePolicy
{
    ServicePolicyId:
        number;
}


/* ============================================================
   Defaults
============================================================ */

export interface ServicePolicySubGroupOption
{
    AccountSubGroupId:
        number;

    SubGroupCode:
        string;

    SubGroupName:
        string;

    GroupName:
        string;

    ClassName:
        string;
}


export interface ServicePolicyBrandOption
{
    BrandManagementId:
        number;

    BrandName:
        string;

    BrandActive:
        boolean;

    // Set when the brand already has a policy
    ServicePolicyId:
        number | null;
}


export interface ServicePolicyDefaults
{
    Code:
        string;

    DefaultSubGroupId:
        number;

    // True once a policy exists : every policy uses the same
    // Associated Sub Group
    IsSubGroupFixed:
        boolean;

    // Next Associated Ledger Code under DefaultSubGroupId
    NextLedgerCode:
        string;

    SubGroups:
        ServicePolicySubGroupOption[];

    Brands:
        ServicePolicyBrandOption[];
}