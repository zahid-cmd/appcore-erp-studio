//===============================================================
// Chart of Inventory (read-only)
//
// Tree     : Category Type (Motor Bikes / Spare Parts /
//            Accessories) → Product Category → Product Sub Category
// Products : loaded per Sub Category (Motor Bikes, Spare Parts,
//            Accessories)
//
// The page owns no data: every load reads the live product
// setting tables, so changes made on those pages show up here.
// Counts come from the server. ActiveProductCount lets the page
// show "active only" totals without loading every product.
//===============================================================

export type CoiLevel =
    | 'type'
    | 'category'
    | 'subcategory';

// Sent by the server : Motor Bike / Spare Part / Accessory.
// Kept as a plain string so a new product table shows up as-is,
// without a frontend change.
export type CoiItemType =
    string;


//===============================================================
// Sub Category Node
//===============================================================

export interface CoiSubCategoryNode
{
    Id: number;

    Code: string;

    Name: string;

    Status: boolean;

    ProductCount: number;

    ActiveProductCount: number;
}


//===============================================================
// Category Node
//===============================================================

export interface CoiCategoryNode
{
    Id: number;

    Code: string;

    Name: string;

    Status: boolean;

    SubCategories: CoiSubCategoryNode[];
}


//===============================================================
// Type Node
//===============================================================

export interface CoiTypeNode
{
    Id: number;

    Code: string;

    Name: string;

    // Motor Bikes / Spare Parts / Accessories
    CategoryType: string;

    Status: boolean;

    Categories: CoiCategoryNode[];
}


//===============================================================
// Product Row (leaf)
//===============================================================

export interface CoiProductRow
{
    Id: number;

    SubCategoryId: number;

    Code: string;

    Name: string;

    ItemType: CoiItemType;

    // Pcs, Set, Pair … (bikes : Pcs)
    Unit: string;

    InventoryLedger: string;

    Status: boolean;
}


//===============================================================
// Link Issue (from the server's link check)
//===============================================================

export interface CoiIssue
{
    // Category / Sub Category / Product (Spare Part) …
    Level: string;

    Id: number;

    Code: string;

    Name: string;

    Problem: string;
}


//===============================================================
// Print Options
//===============================================================

export type CoiPrintScope =
    | 'all'
    | 'selection';

export type CoiPrintDepth =
    | 'type'
    | 'category'
    | 'subcategory'
    | 'product';

export interface CoiPrintOptions
{
    scope: CoiPrintScope;

    depth: CoiPrintDepth;

    includeInactive: boolean;

    showUnit: boolean;

    showLedger: boolean;

    showStatus: boolean;

    landscape: boolean;
}