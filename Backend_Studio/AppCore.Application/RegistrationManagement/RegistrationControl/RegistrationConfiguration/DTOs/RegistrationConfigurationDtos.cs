//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.RegistrationManagement.RegistrationControl;


//===============================================================
// Registration Configuration : fixed lists
//===============================================================

public static class RegistrationPlans
{
    public const string Installment = "Installment";

    public const string FullRegistration = "FullRegistration";

    // Plan -> (label, validity in years)
    public static readonly IReadOnlyDictionary<string, (string Label, int Years)> All =
        new Dictionary<string, (string Label, int Years)>(StringComparer.OrdinalIgnoreCase)
        {
            [Installment]      = ("Installment System", 2),
            [FullRegistration] = ("One Time Full Registration", 10)
        };
}


public static class RegistrationModes
{
    public const string Online = "Online";

    public const string Offline = "Offline";

    public static readonly string[] All =
    {
        Online,
        Offline
    };
}


// Vehicle power of a registration type. A bike's power comes from
// its specification : Fuel Type Electric -> Electric; Petrol,
// Octane, Hybrid, Diesel, CNG -> Fuel (owner, 2026-11-08).
public static class RegistrationVehiclePowers
{
    public const string Fuel = "Fuel";

    public const string Electric = "Electric";

    public static readonly string[] All =
    {
        Fuel,
        Electric
    };

    // The registration power of a specification's Fuel Type
    public static string OfFuelType(string? fuelType) =>
        string.Equals((fuelType ?? string.Empty).Trim(), "Electric", StringComparison.OrdinalIgnoreCase)
            ? Electric
            : Fuel;
}


// The registration statuses (hard-coded : they drive the pages)
public static class RegistrationStages
{
    public const string Pending = "Pending";

    public const string Processing = "Processing";

    public const string SubmittedToBrta = "SubmittedToBrta";

    public const string RegistrationCompleted = "RegistrationCompleted";

    public const string Delivered = "Delivered";

    public const string Cancelled = "Cancelled";
}


//===============================================================
// Rate state of a dated row (fees / costs)
//===============================================================

public static class RegistrationRateStates
{
    // The active row with the latest Effective From on or before
    // today (one per type)
    public const string Current = "Current";

    // Effective From after today
    public const string Upcoming = "Upcoming";

    // Replaced by a later current row, or inactive
    public const string Old = "Old";
}


//===============================================================
// Registration Types
//===============================================================

public class RegistrationTypeDto
{
    public long RegistrationTypeId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string RegistrationPlan { get; set; } = string.Empty;

    public string PlanName { get; set; } = string.Empty;

    public int ValidityYears { get; set; }

    public string RegistrationMode { get; set; } = string.Empty;

    public string VehiclePower { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public bool IsDefault { get; set; }

    public bool IsSystem { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // Live fee / cost rows (a type with rows cannot be deleted)
    public int FeeCount { get; set; }

    public int CostCount { get; set; }

    // Usable on a sale today : a current fee AND a current cost
    public bool Usable { get; set; }
}


public class SaveRegistrationTypeDto
{
    public string RegistrationPlan { get; set; } = string.Empty;

    public string RegistrationMode { get; set; } = string.Empty;

    // Fuel / Electric
    public string VehiclePower { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // 0 = after the last one
    public int DisplayOrder { get; set; }

    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Registration Fees
//===============================================================

public class RegistrationFeeDto
{
    public long RegistrationFeeId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long RegistrationTypeId { get; set; }

    public Guid RegistrationTypePublicId { get; set; }

    public string RegistrationTypeName { get; set; } = string.Empty;

    public string RegistrationMode { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    public decimal MinimumCollection { get; set; }

    public decimal MaximumCollection { get; set; }

    // Current / Upcoming / Old
    public string RateState { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class SaveRegistrationFeeDto
{
    // Locked after saving
    public Guid RegistrationTypePublicId { get; set; }

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    public decimal MinimumCollection { get; set; }

    public decimal MaximumCollection { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Registration Costs
//===============================================================

public class RegistrationCostDto
{
    public long RegistrationCostId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long RegistrationTypeId { get; set; }

    public Guid RegistrationTypePublicId { get; set; }

    public string RegistrationTypeName { get; set; } = string.Empty;

    public string RegistrationMode { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    public decimal BrtaFees { get; set; }

    public decimal SubmissionCharges { get; set; }

    public decimal BrtaTips { get; set; }

    public decimal RegistrationCommission { get; set; }

    public decimal TotalCost { get; set; }

    // Current / Upcoming / Old
    public string RateState { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class SaveRegistrationCostDto
{
    // Locked after saving
    public Guid RegistrationTypePublicId { get; set; }

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    public decimal BrtaFees { get; set; }

    public decimal SubmissionCharges { get; set; }

    public decimal BrtaTips { get; set; }

    public decimal RegistrationCommission { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Stage Timings (edit only)
//===============================================================

public class RegistrationStageTimingDto
{
    public long RegistrationStageTimingId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string StageKey { get; set; } = string.Empty;

    public string StageName { get; set; } = string.Empty;

    public int StageOrder { get; set; }

    public int? ExpectedDays { get; set; }

    public string ColorCode { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}


public class SaveRegistrationStageTimingDto
{
    // null = no overdue check
    public int? ExpectedDays { get; set; }

    public string ColorCode { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}


//===============================================================
// Everything the page shows (one call)
//===============================================================

public class RegistrationConfigurationDto
{
    public List<RegistrationTypeDto> Types { get; set; } = new();

    public List<RegistrationFeeDto> Fees { get; set; } = new();

    public List<RegistrationCostDto> Costs { get; set; } = new();

    public List<RegistrationStageTimingDto> Stages { get; set; } = new();

    // yyyy-MM-dd (the server's today, for Current / Upcoming)
    public string Today { get; set; } = string.Empty;
}


//===============================================================
// Next codes / order (Add)
//===============================================================

public class RegistrationConfigurationDefaultsDto
{
    public string TypeCode { get; set; } = string.Empty;

    public int NextTypeOrder { get; set; } = 1;

    public string FeeCode { get; set; } = string.Empty;

    public string CostCode { get; set; } = string.Empty;
}
