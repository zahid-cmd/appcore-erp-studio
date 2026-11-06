//===============================================================
// Chart of Services (read-only)
//
// Tree     : Category Type (Brand Services / Differential
//            Services) → Service Category → Service Sub Category
// Services : loaded per Sub Category (Scheduled Services, Labor
//            Chart, Customized Services, Membership Services)
//
// The page owns no data: every load reads the live service
// setting tables, so changes made on those pages show up here.
// Counts come from the server. ActiveServiceCount lets the page
// show "active only" totals without loading every service.
//===============================================================

export type CosLevel =
    | 'type'
    | 'category'
    | 'subcategory';

// Sent by the server : Scheduled Service / Labor Chart /
// Customized Service / Membership Service.
// Kept as a plain string so a new service table shows up as-is,
// without a frontend change.
export type CosItemType =
    string;


//===============================================================
// Sub Category Node
//===============================================================

export interface CosSubCategoryNode
{
    Id: number;

    Code: string;

    Name: string;

    // Labor Chart / Scheduled Services / Customized Services /
    // Membership Services
    SubCategoryType: string;

    Status: boolean;

    ServiceCount: number;

    ActiveServiceCount: number;
}


//===============================================================
// Category Node
//===============================================================

export interface CosCategoryNode
{
    Id: number;

    Code: string;

    Name: string;

    Status: boolean;

    SubCategories: CosSubCategoryNode[];
}


//===============================================================
// Type Node
//===============================================================

export interface CosTypeNode
{
    Id: number;

    Code: string;

    Name: string;

    // Brand Services / Differential Services
    CategoryType: string;

    Status: boolean;

    Categories: CosCategoryNode[];
}


//===============================================================
// Service Row (leaf)
//===============================================================

export interface CosServiceRow
{
    Id: number;

    SubCategoryId: number;

    Code: string;

    Name: string;

    ItemType: CosItemType;

    // Scheduled : Customer Charge; Labor / Customized : Service
    // Charge; Membership : Service Value
    Charge: number;

    // Labor / Customized only (0 otherwise)
    StandardMinutes: number;

    IncomeLedger: string;

    // Membership only
    ExpenseLedger: string;

    // Scheduled : false until priced
    IsConfigured: boolean;

    Status: boolean;
}


//===============================================================
// Link Issue (from the server's link check)
//===============================================================

export interface CosIssue
{
    // Category / Sub Category / Service (Labor Chart) …
    Level: string;

    Id: number;

    Code: string;

    Name: string;

    Problem: string;
}


//===============================================================
// Print Options
//===============================================================

export type CosPrintScope =
    | 'all'
    | 'selection';

export type CosPrintDepth =
    | 'type'
    | 'category'
    | 'subcategory'
    | 'service';

export interface CosPrintOptions
{
    scope: CosPrintScope;

    depth: CosPrintDepth;

    includeInactive: boolean;

    showCharge: boolean;

    showLedger: boolean;

    showStatus: boolean;

    landscape: boolean;
}