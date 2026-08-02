//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.RoleManagement;

//===============================================================
// Role Profile
//===============================================================

public class RoleProfile
{
    /* =====================================================
       PRIMARY KEY
    ===================================================== */

    public long RoleProfileId { get; set; }

    /* =====================================================
       BASIC INFORMATION
    ===================================================== */

    public string ProfileCode { get; set; } = string.Empty;

    public string ProfileName { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    /* =====================================================
       PROFILE TYPE
    ===================================================== */

    public long ProfileTypeId { get; set; }

    /* =====================================================
       DESCRIPTION
    ===================================================== */

    public string? Remarks { get; set; }

    /* =====================================================
       DISPLAY
    ===================================================== */

    public int DisplayOrder { get; set; }

    /* =====================================================
       SYSTEM FLAGS
    ===================================================== */

    public bool IsSystemRole { get; set; } = false;

    public bool IsDefaultRole { get; set; } = false;

    /* =====================================================
       STATUS
    ===================================================== */

    public bool IsActive { get; set; } = true;

    /* =====================================================
       SOFT DELETE
    ===================================================== */

    public bool IsDeleted { get; set; } = false;

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    /* =====================================================
       AUDIT INFORMATION
    ===================================================== */

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}