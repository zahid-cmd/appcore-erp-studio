namespace AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.DTOs;

public class CreateRoleProfileDto
{
    /* =====================================================
       BASIC INFORMATION
    ===================================================== */

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
}