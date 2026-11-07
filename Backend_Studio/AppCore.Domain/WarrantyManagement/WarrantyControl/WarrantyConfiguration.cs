//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;


//===============================================================
// Warranty Configuration (hand-written page, NO Code
// Synchronization; tables made by WarrantyConfiguration_
// Tables.sql). Three tabs, three tables :
//
//   WarrantyParts       WPT-001  Battery, Motor, Controller ...
//   WarrantyPolicies    WPO-001  per brand (optional model) :
//                                From / To, whole-bike period +
//                                km, terms, exclusions
//   WarrantyCoverages   WCV-001  part-level warranty of a policy
//===============================================================


//===============================================================
// Warranty Parts : the parts a coverage can name
//===============================================================

public class WarrantyParts
{
    public long WarrantyPartId { get; set; }

    public Guid PublicId { get; set; }

    // WPT-001 (deleted rows count, never reused)
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

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


//===============================================================
// Warranty Policies : the warranty of a brand (or one model)
// for a date range; holds the whole-bike period
//===============================================================

public class WarrantyPolicies
{
    public long WarrantyPolicyId { get; set; }

    public Guid PublicId { get; set; }

    // WPO-001
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public long BrandManagementId { get; set; }

    // Empty = every model of the brand
    public long? BikeModelId { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    // Empty = open-ended
    public DateOnly? EffectiveTo { get; set; }

    // The whole-bike warranty
    public int PeriodValue { get; set; }

    // Days / Months / Years
    public string PeriodUnit { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    public string Terms { get; set; } = string.Empty;

    public string Exclusions { get; set; } = string.Empty;

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


//===============================================================
// Warranty Coverages : the warranty of one part under a policy
//===============================================================

public class WarrantyCoverages
{
    public long WarrantyCoverageId { get; set; }

    public Guid PublicId { get; set; }

    // WCV-001
    public string Code { get; set; } = string.Empty;

    public long WarrantyPolicyId { get; set; }

    public long WarrantyPartId { get; set; }

    public int PeriodValue { get; set; }

    // Days / Months / Years
    public string PeriodUnit { get; set; } = string.Empty;

    public int? KmLimit { get; set; }

    public string Notes { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
