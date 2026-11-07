//===============================================================
// Bike Accessory Schemes (Product Settings › Bike Accessory Schemes)
//
// Which accessories go with which bike models :
//   Kind   : Additional  (all year, no end date)
//            Promotional (From – To)
//   Source : Supplier (free Additional / Promotional products)
//            Company   (For Sale accessories, at cost)
//===============================================================

export const SCHEME_KINDS:
    string[] =
    ['Additional', 'Promotional'];

export const SCHEME_SOURCES:
    string[] =
    ['Supplier', 'Company'];


export interface BikeAccessorySchemeModel
{
    BikeModelId: number;

    ModelCode: string;

    ModelName: string;
}


export interface BikeAccessorySchemeItem
{
    AccessoryId: number;

    ProductCode: string;

    AccessoryName: string;

    AccessoryUse: string;

    QuantityPerBike: number;
}


export interface BikeAccessorySchemes
{
    BikeAccessorySchemeId: number;

    // The id used in links and API calls (uuid v7)
    PublicId?: string;

    // BAS-0001 (given by the server)
    SchemeCode: string;

    SchemeName: string;

    SchemeKind: string;

    SchemeSource: string;

    BrandManagementId: number | null;

    BrandName?: string;

    // yyyy-MM-dd
    ValidFrom: string;

    ValidTo: string | null;

    // Running / Scheduled / Expired (today)
    Validity?: string;

    ModelsText?: string;

    ItemsText?: string;

    ModelCount?: number;

    ItemCount?: number;

    Models: BikeAccessorySchemeModel[];

    Items: BikeAccessorySchemeItem[];

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Create / Update
//===============================================================

export interface BikeAccessorySchemeItemInput
{
    AccessoryId: number;

    QuantityPerBike: number;
}

export interface CreateBikeAccessorySchemes
{
    SchemeName: string;

    SchemeKind: string;

    SchemeSource: string;

    BrandManagementId: number;

    // yyyy-MM-dd
    ValidFrom: string;

    ValidTo: string | null;

    BikeModelIds: number[];

    Items: BikeAccessorySchemeItemInput[];

    Remarks: string;

    Status: boolean;
}

export interface UpdateBikeAccessorySchemes
    extends CreateBikeAccessorySchemes
{
    BikeAccessorySchemeId: number;
}


//===============================================================
// Defaults (next code, kinds, sources, brands, models, accessories)
//===============================================================

export interface BikeAccessorySchemeBrandOption
{
    BrandManagementId: number;

    BrandName: string;

    Status: boolean;
}

export interface BikeAccessorySchemeModelOption
{
    BikeModelId: number;

    BrandManagementId: number;

    ModelCode: string;

    ModelName: string;

    Status: boolean;
}

export interface BikeAccessorySchemeAccessoryOption
{
    AccessoryId: number;

    ProductCode: string;

    AccessoryName: string;

    // For Sale / Additional Accessories / Promotional Accessories
    AccessoryUse: string;

    SubCategoryName: string;

    IsActive: boolean;
}

export interface BikeAccessorySchemesDefaults
{
    Code: string;

    Kinds: string[];

    Sources: string[];

    Brands: BikeAccessorySchemeBrandOption[];

    Models: BikeAccessorySchemeModelOption[];

    Accessories: BikeAccessorySchemeAccessoryOption[];
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface BikeAccessorySchemesPageQuery
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
    schemeKind?:string | null;

    validity?:string | null;

    brandManagementId?:number | null;
}
