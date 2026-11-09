//===============================================================
// Motor Bike Specifications (Product Settings › Motor Bike
// Specifications)
//
// One specification per Bike Model :
//   Registration Data (BRTA) : Engine CC (or Motor Power for
//   electric bikes), fuel, cylinders, vehicle class, body type,
//   seats, weights, maker, country of origin.
//   Technical rows : Section › Label = Value (website page).
//===============================================================

export const FUEL_ELECTRIC:
    string =
    'Electric';


export interface MotorBikeSpecificationItem
{
    Section: string;

    LineNo: number;

    Label: string;

    Value: string;
}


export interface MotorBikeSpecifications
{
    MotorBikeSpecificationId: number;

    // The id used in links and API calls (uuid v7)
    PublicId?: string;

    // MBS-0001 (given by the server)
    SpecificationCode: string;

    BikeModelId: number | null;

    ModelCode?: string;

    ModelName?: string;

    BrandManagementId?: number;

    BrandName?: string;

    EngineCc: number;

    MotorPowerWatts: number;

    FuelType: string;

    Cylinders: number;

    VehicleClass: string;

    BodyType: string;

    SeatingCapacity: number;

    UnladenWeightKg: number;

    LadenWeightKg: number;

    Maker: string;

    CountryOfOrigin: string;

    // Form-17 item 29 : horse power (petrol) / battery capacity (electric)
    HorsePower: string;

    Rpm: number;

    // Website : mileage / range text and top speed (km/h, 0 = none)
    Mileage: string;

    TopSpeedKmh: number;

    WheelBaseMm: number;

    LengthMm: number;

    WidthMm: number;

    HeightMm: number;

    TyreCount: number;

    FrontTyreSize: string;

    RearTyreSize: string;

    AxleCount: number;

    ItemCount?: number;

    Items: MotorBikeSpecificationItem[];

    ShowOnWebsite: boolean;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Create / Update
//===============================================================

export interface MotorBikeSpecificationItemInput
{
    Section: string;

    Label: string;

    Value: string;
}

export interface CreateMotorBikeSpecifications
{
    BikeModelId: number;

    EngineCc: number;

    MotorPowerWatts: number;

    FuelType: string;

    Cylinders: number;

    VehicleClass: string;

    BodyType: string;

    SeatingCapacity: number;

    UnladenWeightKg: number;

    LadenWeightKg: number;

    Maker: string;

    CountryOfOrigin: string;

    // Form-17 item 29 : horse power (petrol) / battery capacity (electric)
    HorsePower: string;

    Rpm: number;

    // Website : mileage / range text and top speed (km/h, 0 = none)
    Mileage: string;

    TopSpeedKmh: number;

    WheelBaseMm: number;

    LengthMm: number;

    WidthMm: number;

    HeightMm: number;

    TyreCount: number;

    FrontTyreSize: string;

    RearTyreSize: string;

    AxleCount: number;

    Items: MotorBikeSpecificationItemInput[];

    ShowOnWebsite: boolean;

    Remarks: string;

    Status: boolean;
}

export interface UpdateMotorBikeSpecifications
    extends CreateMotorBikeSpecifications
{
    MotorBikeSpecificationId: number;
}


//===============================================================
// Defaults (next code, lists, suggested rows, brands, models)
//===============================================================

export interface MotorBikeSpecificationBrandOption
{
    BrandManagementId: number;

    BrandName: string;

    Status: boolean;
}

export interface MotorBikeSpecificationModelOption
{
    BikeModelId: number;

    BrandManagementId: number;

    BrandName: string;

    // The brand's Maker's Name (Brand Management)
    MakerName: string;

    ModelCode: string;

    ModelName: string;

    Status: boolean;

    // The model's live specification ('' = none yet)
    SpecificationPublicId: string;

    SpecificationCode: string;
}

export interface MotorBikeSpecificationsDefaults
{
    Code: string;

    FuelTypes: string[];

    VehicleClasses: string[];

    Sections: string[];

    SuggestedItems: MotorBikeSpecificationItem[];

    Brands: MotorBikeSpecificationBrandOption[];

    Models: MotorBikeSpecificationModelOption[];
}


//===============================================================
// List page query (server-side paging)
//===============================================================

export interface MotorBikeSpecificationsPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    // Column field ('' = the default sort)
    sort:string;

    dir:'asc' | 'desc';

    // true / false (null = all)
    status:boolean | null;

    // Website tab true, Hidden tab false (null = all)
    showOnWebsite?:boolean | null;

    brandManagementId?:number | null;
}
