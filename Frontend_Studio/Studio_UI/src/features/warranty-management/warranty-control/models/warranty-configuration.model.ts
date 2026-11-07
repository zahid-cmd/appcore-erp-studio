/* ============================================================
   Warranty Configuration (hand-written page, no Code Sync)

   Three tabs, three tables :
     Parts      Warranty Parts      WPT-001  Battery, Motor ...
     Policies   Warranty Policies   WPO-001  per brand (optional
                                             model) : From / To, the
                                             whole-bike period + km,
                                             terms, exclusions
     Coverages  Warranty Coverages  WCV-001  part-level warranty of
                                             a policy
   A period is a number + Days / Months / Years, with an optional
   km limit : the warranty ends at whichever comes first.
============================================================ */

export type WarrantyConfigTab =
    | 'Parts'
    | 'Policies'
    | 'Coverages';


export type WarrantyPeriodUnit =
    | 'Days'
    | 'Months'
    | 'Years';


// A policy's dates against today
export type WarrantyPolicyState =
    | 'Current'
    | 'Upcoming'
    | 'Ended'
    | 'Inactive';


export const WARRANTY_UNITS:
    { label:string; value:WarrantyPeriodUnit }[] =
[
    { label:'Days',   value:'Days' },
    { label:'Months', value:'Months' },
    { label:'Years',  value:'Years' }
];


/* ============================================================
   Rows
============================================================ */

export interface WarrantyPart
{
    WarrantyPartId:number;
    PublicId:string;
    Code:string;
    Name:string;
    DisplayOrder:number;
    Remarks:string;
    IsActive:boolean;
    // Live coverages naming the part
    CoverageCount:number;
}


export interface WarrantyPolicy
{
    WarrantyPolicyId:number;
    PublicId:string;
    Code:string;
    Name:string;
    BrandPublicId:string;
    BrandName:string;
    // '' = all models of the brand
    BikeModelPublicId:string;
    ModelName:string;
    // yyyy-MM-dd
    EffectiveFrom:string;
    // yyyy-MM-dd, '' = open-ended
    EffectiveTo:string;
    // The whole-bike warranty
    PeriodValue:number;
    PeriodUnit:WarrantyPeriodUnit;
    KmLimit:number | null;
    Terms:string;
    Exclusions:string;
    Remarks:string;
    IsActive:boolean;
    PolicyState:WarrantyPolicyState;
    // Part coverages
    CoverageCount:number;
}


export interface WarrantyCoverage
{
    WarrantyCoverageId:number;
    PublicId:string;
    Code:string;
    PolicyPublicId:string;
    PolicyCode:string;
    PolicyName:string;
    ScopeText:string;
    PolicyState:WarrantyPolicyState;
    PartPublicId:string;
    PartName:string;
    PeriodValue:number;
    PeriodUnit:WarrantyPeriodUnit;
    KmLimit:number | null;
    Notes:string;
    IsActive:boolean;
}


export interface WarrantyLookup
{
    PublicId:string;
    Code:string;
    Name:string;
    // Models : the brand
    ParentPublicId:string;
    IsActive:boolean;
}


export interface WarrantyConfiguration
{
    Parts:WarrantyPart[];
    Policies:WarrantyPolicy[];
    Coverages:WarrantyCoverage[];
    Brands:WarrantyLookup[];
    Models:WarrantyLookup[];
    // yyyy-MM-dd (server)
    Today:string;
}


export interface WarrantyConfigurationDefaults
{
    PartCode:string;
    NextPartOrder:number;
    PolicyCode:string;
    CoverageCode:string;
}


/* ============================================================
   Save bodies
============================================================ */

export interface SaveWarrantyPart
{
    Name:string;
    DisplayOrder:number;
    Remarks:string;
    IsActive:boolean;
}


export interface SaveWarrantyPolicy
{
    Name:string;
    BrandPublicId:string;
    BikeModelPublicId:string | null;
    EffectiveFrom:string;
    // '' = open-ended
    EffectiveTo:string;
    PeriodValue:number;
    PeriodUnit:string;
    KmLimit:number | null;
    Terms:string;
    Exclusions:string;
    Remarks:string;
    IsActive:boolean;
}


export interface SaveWarrantyCoverage
{
    PolicyPublicId:string;
    PartPublicId:string;
    PeriodValue:number;
    PeriodUnit:string;
    KmLimit:number | null;
    Notes:string;
    IsActive:boolean;
}


/* ============================================================
   Tabs : label, singular noun, icon, hint, API path
============================================================ */

export interface WarrantyTabInfo
{
    tab:WarrantyConfigTab;
    tabLabel:string;
    noun:string;
    icon:string;
    hint:string;
    // parts / policies / coverages
    path:string;
}


export const WARRANTY_TABS:
    WarrantyTabInfo[] =
[
    {
        tab:'Parts',
        tabLabel:'Warranty Parts',
        noun:'Warranty Part',
        icon:'fas fa-puzzle-piece',
        hint:'The parts a coverage can name : battery, motor, controller, charger ...',
        path:'parts'
    },
    {
        tab:'Policies',
        tabLabel:'Warranty Policies',
        noun:'Warranty Policy',
        icon:'fas fa-shield-halved',
        hint:'The warranty of a brand (or one model) for a date range : the whole-bike period, terms and exclusions.',
        path:'policies'
    },
    {
        tab:'Coverages',
        tabLabel:'Warranty Coverages',
        noun:'Warranty Coverage',
        icon:'fas fa-clipboard-check',
        hint:'Part-level warranty under a policy : battery, motor ... each with its own period and km limit.',
        path:'coverages'
    }
];
