//===============================================================
// Bike Models (Product Settings › Bike Models)
//===============================================================

export interface BikeModels
{
    BikeModelId: number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;

    // BMD-0001 (given by the server)
    ModelCode: string;

    BrandManagementId: number | null;

    BrandCode?: string;

    BrandName?: string;

    ModelName: string;

    BikeType: string;

    ShowOnWebsite: boolean;

    IsFeatured: boolean;

    Tagline: string;

    Description: string;

    DisplayOrder: number;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Create Bike Models
//===============================================================

export interface CreateBikeModels
{
    BrandManagementId: number;

    ModelName: string;

    BikeType: string;

    ShowOnWebsite: boolean;

    IsFeatured: boolean;

    Tagline: string;

    Description: string;

    DisplayOrder: number;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Update Bike Models
//===============================================================

export interface UpdateBikeModels
    extends CreateBikeModels
{
    BikeModelId: number;
}


//===============================================================
// Bike Models Defaults (next code, brands, bike types)
//===============================================================

export interface BikeModelBrandOption
{
    BrandManagementId: number;

    BrandCode: string;

    BrandName: string;

    Status: boolean;
}

export interface BikeModelsDefaults
{
    Code: string;

    Brands: BikeModelBrandOption[];

    BikeTypes: string[];

    // Type of the last saved model (pre-selected for a new one)
    LastBikeType: string;
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface BikeModelsPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    // Column field ('' = the default sort)
    sort:string;

    dir:'asc' | 'desc';

    // true / false (null = all)
    status:boolean | null;

    // Filters (null = all)
    brandManagementId?:number | null;

    bikeType?:string | null;
}
