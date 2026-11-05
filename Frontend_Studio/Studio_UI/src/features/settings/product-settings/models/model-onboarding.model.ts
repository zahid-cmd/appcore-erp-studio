//===============================================================
// Model Onboarding (Settings › Product Settings)
//
// One save : Bike Model + Product Sub Category + one Motor Bike
// per picked colour (all or nothing).
//===============================================================

export interface ModelOnboardingBrand
{
    BrandManagementId: number;

    BrandName: string;

    ProductCategoryId: number;

    CategoryCode: string;

    CategoryName: string;

    // Preview only (the real code is given on save)
    NextSubCategoryCode: string;

    // Model names already used by the brand (duplicate warning)
    ExistingModels: string[];
}


export interface ModelOnboardingColor
{
    ColorManagementId: number;

    ColorName: string;
}


export interface ModelOnboardingDefaults
{
    Brands: ModelOnboardingBrand[];

    BikeTypes: string[];

    Colors: ModelOnboardingColor[];

    NextModelCode: string;

    LastBikeType: string;

    ReorderLevel: number;

    RedLevel: number;

    MaxStockLevel: number;
}


export interface ModelOnboardingRequest
{
    BrandManagementId: number;

    ModelName: string;

    BikeType: string;

    ReorderLevel: number;

    RedLevel: number;

    MaxStockLevel: number;

    ColorManagementIds: number[];

    Remarks: string;
}


export interface ModelOnboardingBike
{
    ColorManagementId: number;

    PublicId: string;

    ProductCode: string;

    ProductName: string;
}


export interface ModelOnboardingResult
{
    BikeModelId: number;

    ModelCode: string;

    ProductSubCategoryId: number;

    SubCategoryCode: string;

    SubCategoryName: string;

    Bikes: ModelOnboardingBike[];
}
