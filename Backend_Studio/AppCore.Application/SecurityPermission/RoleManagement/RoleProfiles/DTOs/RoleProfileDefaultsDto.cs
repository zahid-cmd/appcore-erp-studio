namespace AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.DTOs;

public class RoleProfileDefaultsDto
{
    /* =====================================================
       DEFAULT VALUES
    ===================================================== */

    public string ProfileCode { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    public bool IsSystemRole { get; set; } = false;

    public bool IsDefaultRole { get; set; } = false;

    public bool IsActive { get; set; } = true;
}