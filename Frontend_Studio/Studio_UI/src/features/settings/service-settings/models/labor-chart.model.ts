/* ============================================================
   Sections (fixed list; the server sends the same list)
============================================================ */

export const LABOR_CHART_SECTIONS:
    readonly string[] =
[
    'Engine',
    'Electrical',
    'Brakes',
    'Suspension',
    'Transmission & Clutch',
    'Fuel System',
    'Wheels & Tyres',
    'Body & Frame',
    'Lubrication',
    'Diagnostics',
    'General'
];


/* ============================================================
   Labor Chart
============================================================ */

export interface LaborChart
{
    LaborChartId:
        number;

    // BLC-001-001-00001
    LaborCode:
        string;

    //===========================================================
    // Sub Category / Brand (sub category locked after saving)
    //===========================================================

    ServiceSubCategoryId:
        number;

    SubCategoryCode?:
        string;

    SubCategoryName?:
        string;

    BrandManagementId:
        number;

    BrandName?:
        string;

    //===========================================================
    // Operation
    //===========================================================

    Section:
        string;

    OperationName:
        string;

    //===========================================================
    // Rate & Time
    //===========================================================

    // "100-125cc", "All Models"
    AppliesTo:
        string;

    StandardMinutes:
        number;

    ServiceCharge:
        number;

    // "<Operation> (<Applies To>) - <Brand>"
    ServiceName:
        string;

    //===========================================================
    // Income Ledger
    //===========================================================

    IncomeLedgerCode:
        string;

    IncomeLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Create / Update Labor Chart
============================================================ */

export interface CreateLaborChart
{
    LaborCode:
        string;

    ServiceSubCategoryId:
        number;

    Section:
        string;

    OperationName:
        string;

    AppliesTo:
        string;

    StandardMinutes:
        number;

    ServiceCharge:
        number;

    ServiceName:
        string;

    IncomeLedgerCode:
        string;

    IncomeLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateLaborChart
extends CreateLaborChart
{
    LaborChartId:
        number;
}


/* ============================================================
   Labor Chart sub category option (with the next codes)
============================================================ */

export interface LaborChartSubCategoryOption
{
    ServiceSubCategoryId:
        number;

    SubCategoryCode:
        string;

    SubCategoryName:
        string;

    BrandManagementId:
        number;

    BrandName:
        string;

    IsActive:
        boolean;

    ItemCreationAllowed:
        boolean;

    NextLaborCode:
        string;

    NextIncomeLedgerCode:
        string;

    // Why no operation can be added under it ('' when it can)
    Message:
        string;
}


/* ============================================================
   Labor Chart Defaults
============================================================ */

export interface LaborChartDefaults
{
    SubCategories:
        LaborChartSubCategoryOption[];

    Sections:
        string[];
}