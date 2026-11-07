/* ============================================================
   Registration Configuration (hand-written page, no Code Sync)

   Four tabs, four tables :
     Types    Registration Types        RTY-001  plan + mode
     Fees     Registration Fees         RFE-001  min / max, dated
     Costs    Registration Costs        RCO-001  BRTA fee, submission,
                                                 tips, commission, dated
     Stages   Stage Timings             RST-001  6 fixed statuses
============================================================ */

export type RegistrationConfigTab =
    | 'Types'
    | 'Fees'
    | 'Costs'
    | 'Stages';


export type RegistrationPlan =
    | 'Installment'
    | 'FullRegistration';


export type RegistrationMode =
    | 'Online'
    | 'Offline';


// Fuel / Electric : the Sales Invoice offers the types of the
// bike's power (specification Fuel Type Electric -> Electric,
// every other fuel -> Fuel)
export type RegistrationPower =
    | 'Fuel'
    | 'Electric';


export const REGISTRATION_POWERS:
    { label:string; value:RegistrationPower }[] =
[
    { label:'Fuel',     value:'Fuel' },
    { label:'Electric', value:'Electric' }
];


// Current / Upcoming / Old (dated rates)
export type RegistrationRateState =
    | 'Current'
    | 'Upcoming'
    | 'Old';


// Plan : label and validity (years, fixed)
export const REGISTRATION_PLANS:
    { label:string; value:RegistrationPlan; years:number }[] =
[
    { label:'Installment System',         value:'Installment',      years:2 },
    { label:'One Time Full Registration', value:'FullRegistration', years:10 }
];


export const REGISTRATION_MODES:
    { label:string; value:RegistrationMode }[] =
[
    { label:'Online',  value:'Online' },
    { label:'Offline', value:'Offline' }
];


export const REGISTRATION_COLORS:
    string[] =
[
    '#F59E0B',
    '#2563EB',
    '#8B5CF6',
    '#0D9488',
    '#16A34A',
    '#DC2626',
    '#0EA5E9',
    '#EC4899',
    '#EA580C',
    '#64748B'
];


/* ============================================================
   Rows
============================================================ */

export interface RegistrationType
{
    RegistrationTypeId:number;
    PublicId:string;
    Code:string;
    RegistrationPlan:RegistrationPlan;
    PlanName:string;
    ValidityYears:number;
    RegistrationMode:RegistrationMode;
    VehiclePower:RegistrationPower;
    Name:string;
    DisplayOrder:number;
    IsDefault:boolean;
    IsSystem:boolean;
    Remarks:string;
    IsActive:boolean;
    FeeCount:number;
    CostCount:number;
    // A current fee AND a current cost : offered on a sale
    Usable:boolean;
}


export interface RegistrationFee
{
    RegistrationFeeId:number;
    PublicId:string;
    Code:string;
    RegistrationTypeId:number;
    RegistrationTypePublicId:string;
    RegistrationTypeName:string;
    RegistrationMode:string;
    // yyyy-MM-dd
    EffectiveFrom:string;
    MinimumCollection:number;
    MaximumCollection:number;
    RateState:RegistrationRateState;
    Remarks:string;
    IsActive:boolean;
}


export interface RegistrationCost
{
    RegistrationCostId:number;
    PublicId:string;
    Code:string;
    RegistrationTypeId:number;
    RegistrationTypePublicId:string;
    RegistrationTypeName:string;
    RegistrationMode:string;
    // yyyy-MM-dd
    EffectiveFrom:string;
    BrtaFees:number;
    SubmissionCharges:number;
    BrtaTips:number;
    RegistrationCommission:number;
    TotalCost:number;
    RateState:RegistrationRateState;
    Remarks:string;
    IsActive:boolean;
}


export interface RegistrationStageTiming
{
    RegistrationStageTimingId:number;
    PublicId:string;
    Code:string;
    StageKey:string;
    StageName:string;
    StageOrder:number;
    // null = no overdue check
    ExpectedDays:number | null;
    ColorCode:string;
    Remarks:string;
}


export interface RegistrationConfiguration
{
    Types:RegistrationType[];
    Fees:RegistrationFee[];
    Costs:RegistrationCost[];
    Stages:RegistrationStageTiming[];
    // yyyy-MM-dd (server)
    Today:string;
}


export interface RegistrationConfigurationDefaults
{
    TypeCode:string;
    NextTypeOrder:number;
    FeeCode:string;
    CostCode:string;
}


/* ============================================================
   Save bodies
============================================================ */

export interface SaveRegistrationType
{
    RegistrationPlan:string;
    RegistrationMode:string;
    VehiclePower:string;
    Name:string;
    DisplayOrder:number;
    IsDefault:boolean;
    Remarks:string;
    IsActive:boolean;
}


export interface SaveRegistrationFee
{
    RegistrationTypePublicId:string;
    EffectiveFrom:string;
    MinimumCollection:number;
    MaximumCollection:number;
    Remarks:string;
    IsActive:boolean;
}


export interface SaveRegistrationCost
{
    RegistrationTypePublicId:string;
    EffectiveFrom:string;
    BrtaFees:number;
    SubmissionCharges:number;
    BrtaTips:number;
    RegistrationCommission:number;
    Remarks:string;
    IsActive:boolean;
}


export interface SaveRegistrationStageTiming
{
    ExpectedDays:number | null;
    ColorCode:string;
    Remarks:string;
}


/* ============================================================
   Tabs : label, singular noun, icon, hint
============================================================ */

export interface RegistrationTabInfo
{
    tab:RegistrationConfigTab;
    tabLabel:string;
    noun:string;
    icon:string;
    hint:string;
    // API path part (types / fees / costs / stages)
    path:string;
    // Stage Timings : fixed rows, edit only
    editOnly:boolean;
}


export const REGISTRATION_TABS:
    RegistrationTabInfo[] =
[
    {
        tab:'Types',
        tabLabel:'Registration Types',
        noun:'Registration Type',
        icon:'fas fa-id-card',
        hint:'Plan (validity fixed), mode and vehicle power. No amounts here : fees and costs are dated rates on the next tabs.',
        path:'types',
        editOnly:false
    },
    {
        tab:'Fees',
        tabLabel:'Registration Fees',
        noun:'Registration Fee',
        icon:'fas fa-hand-holding-dollar',
        hint:'What the customer is charged. A rate change is a new row with its own Effective From.',
        path:'fees',
        editOnly:false
    },
    {
        tab:'Costs',
        tabLabel:'Registration Costs',
        noun:'Registration Cost',
        icon:'fas fa-file-invoice-dollar',
        hint:'What the dealer pays out. These amounts are posted and paid as they are.',
        path:'costs',
        editOnly:false
    },
    {
        tab:'Stages',
        tabLabel:'Stage Timings',
        noun:'Stage Timing',
        icon:'fas fa-stopwatch',
        hint:'The registration statuses are fixed. Set the days a file may stay in each before it is overdue.',
        path:'stages',
        editOnly:true
    }
];
