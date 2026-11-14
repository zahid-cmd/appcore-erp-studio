//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Bonus Structures (Human Resource Setup, hand-written page)
//===============================================================

// From so many months of service, so many percent of the salary
public class BonusSlabDto
{
    public int FromMonths { get; set; }

    public decimal BonusPercent { get; set; }
}

public class BonusStructureDto
{
    public long BonusStructureId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    // Joining / Confirmation
    public string ServiceFrom { get; set; } = "Joining";

    public bool ConfirmedOnly { get; set; }

    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // Bonus sheets made with it
    public int SheetCount { get; set; }

    public List<BonusSlabDto> Slabs { get; set; } = new();
}

public class BonusStructureDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public string NextName { get; set; } = string.Empty;

    // No structure yet : the first one is the Default
    public bool IsFirst { get; set; }
}
