//===============================================================
// Registration Profiles (Registration Management > Registration
// Processing). One per chassis the dealer registers : made by a
// posted Sales Invoice - MB with a registration. Read only for
// now (the collection / stage pages come later).
//===============================================================

export interface RegistrationProfileRow
{
    RegistrationProfileId:
        number;
    PublicId:
        string;
    ProfileNo:
        string;
    // yyyy-MM-dd
    ProfileDate:
        string;
    BranchId:
        number;
    BranchName:
        string;
    SalesInvoiceNo:
        string;
    SalesInvoiceDate:
        string;
    CustomerFileNo:
        string;
    CustomerCode:
        string;
    CustomerName:
        string;
    CustomerPhone:
        string;
    SalesmanName:
        string;
    ModelName:
        string;
    ChassisNo:
        string;
    EngineNo:
        string;
    ColorName:
        string;
    VehiclePower:
        string;
    RegistrationTypeName:
        string;
    RegistrationPlan:
        string;
    RegistrationMode:
        string;
    ValidityYears:
        number;
    Amount:
        number;
    CollectedAmount:
        number;
    BrtaFees:
        number;
    SubmissionCharges:
        number;
    BrtaTips:
        number;
    RegistrationCommission:
        number;
    TotalCost:
        number;
    Surplus:
        number;
    // Pending / Processing / SubmittedToBrta / RegistrationCompleted
    // / Delivered / Cancelled
    Status:
        string;
    StatusDate:
        string;
    DaysInStatus:
        number;
    Overdue:
        boolean;
    CancelReason:
        string;
    CreatedDate:
        string;
}

export interface RegistrationProfileStage
{
    StageKey:
        string;
    StageName:
        string;
    ExpectedDays:
        number | null;
    ColorCode:
        string;
}

export interface RegistrationProfilesList
{
    Rows:
        RegistrationProfileRow[];
    Stages:
        RegistrationProfileStage[];
}

// Display names of the stage keys (fallback when Stage Timings
// has no row)
export const REGISTRATION_STAGE_NAMES:
    Record<string, string> =
{
    Pending:'Pending',
    Processing:'Processing',
    SubmittedToBrta:'Submitted To BRTA',
    RegistrationCompleted:'Registration Completed',
    Delivered:'Delivered',
    Cancelled:'Cancelled'
};
