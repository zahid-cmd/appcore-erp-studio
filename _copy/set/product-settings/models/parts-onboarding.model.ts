//===============================================================
// Parts & Accessories Onboarding (Settings › Product Settings)
//
// Many Spare Parts (or Accessories) into one Product Sub
// Category in one save, from an Excel / CSV file or pasted
// cells (all or nothing).
//===============================================================

export type PartsOnboardingType =
    'SpareParts'
    |
    'Accessories';


export interface PartsOnboardingLevels
{
    ReorderLevel: number;

    RedLevel: number;

    MaxStockLevel: number;

    Unit: string;

    MovementClass: string;
}


export interface PartsOnboardingSubCategory
{
    ProductSubCategoryId: number;

    SubCategoryCode: string;

    SubCategoryName: string;

    ItemCount: number;
}


export interface PartsOnboardingCategory
{
    ProductCategoryId: number;

    CategoryCode: string;

    CategoryName: string;

    CategoryType: string;

    ProductType: PartsOnboardingType;

    SubCategories: PartsOnboardingSubCategory[];
}


export interface PartsOnboardingDefaults
{
    Units: string[];

    MovementClasses: string[];

    Categories: PartsOnboardingCategory[];

    SpareParts: PartsOnboardingLevels;

    Accessories: PartsOnboardingLevels;
}


export interface PartsOnboardingExisting
{
    ProductCode: string;

    PartNumber: string;

    Name: string;

    Unit: string;

    ReorderLevel: number;

    RedLevel: number;

    MaxStockLevel: number;

    MovementClass: string;
}


// One row as sent (blank cells already filled with the defaults)
export interface PartsOnboardingRowRequest
{
    Row: number;

    PartNumber: string;

    Name: string;

    Unit: string;

    ReorderLevel: string;

    RedLevel: string;

    MaxStockLevel: string;

    MovementClass: string;

    Remarks: string;
}


export interface PartsOnboardingRequest
{
    ProductType: PartsOnboardingType;

    ProductCategoryId: number;

    ProductSubCategoryId: number;

    Rows: PartsOnboardingRowRequest[];
}


export type PartsOnboardingStatus =
    'Ready'
    |
    'Invalid'
    |
    'Duplicate'
    |
    'Exists'
    |
    // Saved under another model : linked here ("Fits models")
    'Link';


export interface PartsOnboardingCheck
{
    Row: number;

    Status: PartsOnboardingStatus;

    Message: string;

    ProductCode: string;

    PartNumber: string;

    Name: string;

    Unit: string;

    MovementClass: string;
}


export interface PartsOnboardingAnalysis
{
    Rows: PartsOnboardingCheck[];

    ReadyCount: number;

    LinkCount: number;

    Message: string;
}


export interface PartsOnboardingItem
{
    Row: number;

    PublicId: string;

    ProductCode: string;

    PartNumber: string;

    Name: string;
}


export interface PartsOnboardingResult
{
    ProductType: PartsOnboardingType;

    SubCategoryCode: string;

    SubCategoryName: string;

    Items: PartsOnboardingItem[];

    // Saved under another model, now linked to this sub category
    Linked: PartsOnboardingItem[];
}
