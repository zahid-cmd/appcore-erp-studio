//===============================================================
// Business Lines (fixed list, display order)
//
// Motor Bikes, Spare Parts and Accessories are stock types (they
// match Product Category → Category Type). Services has no stock.
//===============================================================

export const BUSINESS_LINES:
    readonly string[] =
[
    'Motor Bikes',
    'Spare Parts',
    'Accessories',
    'Services'
];


export const BUSINESS_LINE_ICONS:
    Readonly<Record<string, string>> =
{
    'Motor Bikes':'fas fa-motorcycle',
    'Spare Parts':'fas fa-gears',
    'Accessories':'fas fa-puzzle-piece',
    'Services':'fas fa-screwdriver-wrench'
};


//===============================================================
// Access types of an extra grant
//
// Fixed     : no end date, stays until revoked
// Temporary : Valid From → Valid Until, ends by itself
//===============================================================

export const ACCESS_TYPES:
    readonly string[] =
[
    'Fixed',
    'Temporary'
];


//===============================================================
// Business Configuration (one extra grant to one branch)
//===============================================================

export interface BusinessConfiguration
{
    BusinessConfigurationId: number;

    CompanyId?: number;

    WingId?: number;

    WingCode?: string;

    WingName?: string;

    BranchId: number;

    BranchCode?: string;

    BranchName?: string;

    BusinessLine: string;

    AccessType: string;

    // 'yyyy-MM-dd' or null
    ValidFrom: string | null;

    ValidUntil: string | null;

    // Active / Scheduled / Expired / Inactive (today)
    State?: string;

    IsCurrentlyActive?: boolean;

    Remarks: string;

    IsActive: boolean;
}


export interface CreateBusinessConfiguration
{
    BranchId: number;

    BusinessLine: string;

    AccessType: string;

    ValidFrom: string | null;

    ValidUntil: string | null;

    Remarks: string;

    IsActive: boolean;
}


export interface UpdateBusinessConfiguration
    extends CreateBusinessConfiguration
{
    BusinessConfigurationId: number;
}


//===============================================================
// Wing Core Business
//===============================================================

export interface WingBusinessLines
{
    WingId: number;

    WingCode: string;

    WingName: string;

    IsActive: boolean;

    BusinessLines: string[];
}


//===============================================================
// Branch Overview (today)
//===============================================================

export interface BranchLineStatus
{
    BusinessLine: string;

    // Core / Granted / Scheduled / Expired / Inactive / None
    Source: string;

    IsActiveToday: boolean;

    AccessType: string;

    ValidFrom: string | null;

    ValidUntil: string | null;

    BusinessConfigurationId: number;
}


export interface BranchBusinessLines
{
    WingId: number;

    WingCode: string;

    WingName: string;

    BranchId: number;

    BranchCode: string;

    BranchName: string;

    IsActive: boolean;

    Lines: BranchLineStatus[];

    ActiveLines: string[];
}


//===============================================================
// Warehouse allowed for a business line (today)
//===============================================================

export interface AllowedWarehouse
{
    WarehouseId: number;

    BranchId: number;

    WingId: number;

    ActiveLines: string[];
}