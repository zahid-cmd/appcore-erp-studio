//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.WarrantyManagement.WarrantyControl;


//===============================================================
// Warranty Configuration : fixed lists
//===============================================================

public static class WarrantyPeriodUnits
{
    public const string Days = "Days";

    public const string Months = "Months";

    public const string Years = "Years";

    public static readonly string[] All =
    {
        Days,
        Months,
        Years
    };
}


//===============================================================
// State of a policy (its dates against today)
//===============================================================

public static class WarrantyPolicyStates
{
    // From <= today <= To (or no To)
    public const string Current = "Current";

    // From after today
    public const string Upcoming = "Upcoming";

    // To before today
    public const string Ended = "Ended";

    // Switched off
    public const string Inactive = "Inactive";
}


//===============================================================
// Warranty Parts
//===============================================================

public class WarrantyPartDto
{
    public long WarrantyPartId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // Live coverages naming the part (cannot be deleted then)
    public int CoverageCount { get; set; }
}


public class SaveWarrantyPartDto
{
    public string Name { get; set; } = string.Empty;

    // 0 = after the last one
    public int DisplayOrder { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Warranty Policies
//===============================================================

public class WarrantyPolicyDto
{
    public long WarrantyPolicyId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public Guid BrandPublicId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public Guid? BikeModelPublicId { get; set; }

    // Empty = all models of the brand
    public string ModelName { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    // yyyy-MM-dd, empty = open-ended
    public string EffectiveTo { get; set; } = string.Empty;

    // The whole-bike warranty
    public int PeriodValue { get; set; }

    public string PeriodUnit { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    public string Terms { get; set; } = string.Empty;

    public string Exclusions { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // Current / Upcoming / Ended / Inactive
    public string PolicyState { get; set; } = string.Empty;

    // Live part coverages of the policy
    public int CoverageCount { get; set; }
}


public class SaveWarrantyPolicyDto
{
    public string Name { get; set; } = string.Empty;

    // Locked after saving
    public Guid? BrandPublicId { get; set; }

    // Locked after saving; empty = all models
    public Guid? BikeModelPublicId { get; set; }

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    // yyyy-MM-dd, empty = open-ended
    public string EffectiveTo { get; set; } = string.Empty;

    // The whole-bike warranty
    public int PeriodValue { get; set; }

    public string PeriodUnit { get; set; } = string.Empty;

    // Empty / 0 = no km limit
    public int? KmLimit { get; set; }

    public string Terms { get; set; } = string.Empty;

    public string Exclusions { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Warranty Coverages
//===============================================================

public class WarrantyCoverageDto
{
    public long WarrantyCoverageId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public Guid PolicyPublicId { get; set; }

    public string PolicyCode { get; set; } = string.Empty;

    public string PolicyName { get; set; } = string.Empty;

    // "Brand Model" or "Brand (all models)"
    public string ScopeText { get; set; } = string.Empty;

    // The policy's state (Current / Upcoming / Ended / Inactive)
    public string PolicyState { get; set; } = string.Empty;

    public Guid PartPublicId { get; set; }

    public string PartName { get; set; } = string.Empty;

    public int PeriodValue { get; set; }

    public string PeriodUnit { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    public string Notes { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class SaveWarrantyCoverageDto
{
    // Locked after saving
    public Guid? PolicyPublicId { get; set; }

    // Locked after saving
    public Guid? PartPublicId { get; set; }

    public int PeriodValue { get; set; }

    public string PeriodUnit { get; set; } = string.Empty;

    // Empty / 0 = no km limit
    public int? KmLimit { get; set; }

    public string Notes { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Lookups for the dropdowns
//===============================================================

public class WarrantyLookupDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Models : the brand they belong to
    public Guid? ParentPublicId { get; set; }

    public bool IsActive { get; set; }
}


//===============================================================
// Everything the page shows (one call)
//===============================================================

public class WarrantyConfigurationDto
{
    public List<WarrantyPartDto> Parts { get; set; } = new();

    public List<WarrantyPolicyDto> Policies { get; set; } = new();

    public List<WarrantyCoverageDto> Coverages { get; set; } = new();

    public List<WarrantyLookupDto> Brands { get; set; } = new();

    public List<WarrantyLookupDto> Models { get; set; } = new();

    // yyyy-MM-dd (the server's today, for Current / Upcoming)
    public string Today { get; set; } = string.Empty;
}


//===============================================================
// Next codes / order (Add)
//===============================================================

public class WarrantyConfigurationDefaultsDto
{
    public string PartCode { get; set; } = string.Empty;

    public int NextPartOrder { get; set; } = 1;

    public string PolicyCode { get; set; } = string.Empty;

    public string CoverageCode { get; set; } = string.Empty;
}
