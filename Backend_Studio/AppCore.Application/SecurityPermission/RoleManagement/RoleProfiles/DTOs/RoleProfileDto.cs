namespace AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.DTOs;

public class RoleProfileDto
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

    public string ProfileTypeName { get; set; } = string.Empty;

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

    public bool IsSystemRole { get; set; }

    public bool IsDefaultRole { get; set; }

    /* =====================================================
       STATUS
    ===================================================== */

    public bool IsActive { get; set; }
}