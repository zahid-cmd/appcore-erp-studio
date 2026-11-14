//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Bonus Structures (HumanResource_BonusStructures_Engine.sql;
// hand-written page, no Code Sync).
//
// HrBonusStructures      BNS-0001 "Bonus Structure - 1" : how a
//                        festival bonus is worked out (on Basic or
//                        Gross), where the service is counted from
//                        and who gets it. One is the Default.
// HrBonusStructureSlabs  from so many months of service, so many
//                        percent of the salary
//===============================================================

public class HrBonusStructures
{
    public long BonusStructureId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Basic / Gross
    public string RateBase { get; set; } = "Basic";

    // Joining / Confirmation : where the service is counted from
    public string ServiceFrom { get; set; } = "Joining";

    // Only employees who are confirmed on the bonus date
    public bool ConfirmedOnly { get; set; }

    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class HrBonusStructureSlabs
{
    public long BonusStructureSlabId { get; set; }

    public long BonusStructureId { get; set; }

    // From this many whole months of service (and above)
    public int FromMonths { get; set; }

    public decimal BonusPercent { get; set; }
}
