//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Motor Bike Specifications (Settings › Product Settings)
//
// One specification per Bike Model (all colours share it) :
//   Registration Data (fixed, what BRTA asks for) : Engine CC,
//   Motor Power (electric), Fuel Type, Cylinders, Vehicle Class,
//   Body Type, Seating Capacity, Unladen / Laden Weight, Maker,
//   Country of Origin.
//   Technical rows (MotorBikeSpecificationItems) : Section,
//   Label, Value - shown on the website model page.
//
// Tables : MotorBikeSpecifications, MotorBikeSpecificationItems
//          (MotorBikeSpecifications_Tables.sql)
//===============================================================

public class MotorBikeSpecifications
{
    public long MotorBikeSpecificationId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // MBS-0001 (given on save, never reused)
    public string SpecificationCode { get; set; } = string.Empty;

    // One live specification per bike model
    public long BikeModelId { get; set; }

    //-----------------------------------------------------------
    // Registration Data (BRTA)
    //-----------------------------------------------------------

    // Cubic capacity (0 only for electric bikes)
    public decimal EngineCc { get; set; }

    // Electric bikes : motor power in watts (0 = not given)
    public int MotorPowerWatts { get; set; }

    // Petrol / Octane / Electric / Hybrid / Diesel / CNG
    public string FuelType { get; set; } = "Petrol";

    // Petrol : cylinders; Electric : BRTA "Number of Motor"
    public int Cylinders { get; set; }

    // e.g. Motor Cycle
    public string VehicleClass { get; set; } = string.Empty;

    // e.g. Motor Cycle, Scooter
    public string BodyType { get; set; } = string.Empty;

    public int SeatingCapacity { get; set; } = 2;

    public decimal UnladenWeightKg { get; set; }

    public decimal LadenWeightKg { get; set; }

    public string Maker { get; set; } = string.Empty;

    public string CountryOfOrigin { get; set; } = string.Empty;

    // Form-17 item 29 : horse power (petrol, as on the maker's sheet,
    // e.g. "14.5 PS @ 8500 rpm") or battery capacity (electric,
    // e.g. "48V 12Ah")
    public string HorsePower { get; set; } = string.Empty;

    // Form-17 item 32 (0 = not given)
    public int Rpm { get; set; }

    // Website : mileage (petrol, e.g. "45 km per litre") or range
    // (electric, e.g. "80 km per charge"); empty = not given
    public string Mileage { get; set; } = string.Empty;

    // Website : top speed in km/h (0 = not given)
    public int TopSpeedKmh { get; set; }

    //-----------------------------------------------------------
    // Size and tyres (Form-17 items 34, 37 - 39, 41), mm
    //-----------------------------------------------------------

    public int WheelBaseMm { get; set; }

    public int LengthMm { get; set; }

    public int WidthMm { get; set; }

    public int HeightMm { get; set; }

    public int TyreCount { get; set; } = 2;

    public string FrontTyreSize { get; set; } = string.Empty;

    public string RearTyreSize { get; set; } = string.Empty;

    // BRTA portal shows 1 for a motor cycle
    public int AxleCount { get; set; } = 1;

    //-----------------------------------------------------------
    // Display / state
    //-----------------------------------------------------------

    public bool ShowOnWebsite { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// A technical row : Section › Label = Value
//===============================================================

public class MotorBikeSpecificationItems
{
    public long MotorBikeSpecificationItemId { get; set; }

    public long MotorBikeSpecificationId { get; set; }

    // Engine / Motor, Transmission, Chassis & Suspension, Brakes &
    // Wheels, Dimensions & Capacity, Electricals, Features
    public string Section { get; set; } = string.Empty;

    // Order inside the section
    public int LineNo { get; set; }

    public string Label { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;
}
