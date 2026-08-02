using AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.DTOs;

namespace AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.Interfaces;

public interface IRoleProfileRepository
{
    /* =====================================================
       DEFAULTS
    ===================================================== */

    Task<RoleProfileDefaultsDto> GetDefaultsAsync();

    /* =====================================================
       LIST
    ===================================================== */

    Task<List<RoleProfileDto>> GetAllAsync();

    Task<List<RoleProfileDto>>
        GetAvailableForActivityAssignmentAsync();

    Task<RoleProfileDto?> GetByIdAsync(long roleProfileId);

    /* =====================================================
       CREATE
    ===================================================== */

    Task<long> CreateAsync(CreateRoleProfileDto dto);

    /* =====================================================
       UPDATE
    ===================================================== */

    Task<bool> UpdateAsync(UpdateRoleProfileDto dto);

    /* =====================================================
       DELETE
    ===================================================== */

    Task<bool> DeleteAsync(long roleProfileId);

    /* =====================================================
       RESTORE
    ===================================================== */

    Task<bool> RestoreAsync();

    /* =====================================================
       VALIDATION
    ===================================================== */

    Task<bool> ExistsByProfileNameAsync
    (
        string profileName,
        long? excludeRoleProfileId = null
    );

    Task<bool> ExistsByDisplayNameAsync
    (
        string displayName,
        long? excludeRoleProfileId = null
    );
}