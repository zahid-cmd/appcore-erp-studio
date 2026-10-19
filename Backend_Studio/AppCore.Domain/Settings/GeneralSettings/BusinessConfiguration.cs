//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Business Configuration
//
// One row = one EXTRA business line granted to one branch
// (on top of the core line(s) of the branch's wing).
//
// Business lines : Motor Bikes · Spare Parts · Accessories · Services
// Access type    : Fixed      no end date, stays until revoked
//                  Temporary  Valid From → Valid Until, ends by itself
//
// A grant is active on a day when it is not deleted, IsActive is
// true and the day is inside Valid From / Valid Until (an empty
// date means open). Revoke = soft delete (kept in history).
//===============================================================

public class BusinessConfiguration
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long BusinessConfigurationId { get; set; }


    //===========================================================
    // Branch (company / wing copied from the branch)
    //===========================================================

    public long CompanyId { get; set; }

    public long WingId { get; set; }

    public long BranchId { get; set; }


    //===========================================================
    // Grant
    //===========================================================

    // Motor Bikes / Spare Parts / Accessories / Services
    public string BusinessLine { get; set; } = string.Empty;

    // Fixed / Temporary
    public string AccessType { get; set; } = string.Empty;

    public DateOnly? ValidFrom { get; set; }

    public DateOnly? ValidUntil { get; set; }


    //===========================================================
    // Description / Status
    //===========================================================

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted { get; set; } = false;

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}