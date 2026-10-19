//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Business Configuration DTO (one extra grant)
//===============================================================

public class BusinessConfigurationDto
{
    public long BusinessConfigurationId { get; set; }


    //===========================================================
    // Branch
    //===========================================================

    public long CompanyId { get; set; }

    public long WingId { get; set; }

    public string WingCode { get; set; } = string.Empty;

    public string WingName { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;


    //===========================================================
    // Grant
    //===========================================================

    public string BusinessLine { get; set; } = string.Empty;

    // Fixed / Temporary
    public string AccessType { get; set; } = string.Empty;

    public DateOnly? ValidFrom { get; set; }

    public DateOnly? ValidUntil { get; set; }

    // Today : Active / Scheduled / Expired / Inactive
    public string State { get; set; } = string.Empty;

    // True when the grant is in force today
    public bool IsCurrentlyActive { get; set; }


    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }


    //===========================================================
    // Soft Delete / Audit
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}