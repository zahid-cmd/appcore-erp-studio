//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// System Configurations Repository Interface
//
// Access (worked out on the server from Effective Access, by
// code) :
//   Manage Configurations (ACT-0006) on System Configurations
//   (SUB-003-001-005)  → admin : every switch, add / edit /
//                        delete, approve
//   Change Configuration (ACT-0007) on a page submenu → that
//                        page's switches only
//
// Errors :
//   UnauthorizedAccessException → 403
//   KeyNotFoundException        → 404
//   InvalidOperationException   → 400 / 409
//===============================================================

public interface ISystemConfigurationsRepository
{
    //===========================================================
    // Runtime values (any logged-in user; pages read by code)
    //===========================================================

    Task<List<SystemConfigurationValueDto>> GetValuesAsync();


    //===========================================================
    // Page
    //===========================================================

    Task<SystemConfigurationWorkspaceDto> GetWorkspaceAsync(
        long userId);

    Task<List<SystemConfigurationsDto>> GetAllAsync(
        long userId);

    Task<SystemConfigurationsDto?> GetByIdAsync(
        long id,
        long userId);

    // Switch ids whose history this user may see; null = all
    Task<HashSet<long>?> GetVisibleIdsAsync(
        long userId);

    Task<string> GetNextCodeAsync(
        long navigationModuleId);

    Task<SystemConfigurationsDefaultsDto> GetDefaultsAsync(
        long navigationModuleId);


    //===========================================================
    // Changes (Review & Apply)
    //===========================================================

    Task<ApplySystemConfigurationResultDto> ApplyAsync(
        ApplySystemConfigurationChangesDto dto,
        long userId,
        string userName);

    Task SetEnabledAsync(
        long id,
        bool isEnabled,
        string reason,
        long userId,
        string userName);


    //===========================================================
    // Approvals (admin)
    //===========================================================

    Task<List<SystemConfigurationRequestDto>> GetRequestsAsync(
        long userId);

    Task ApproveRequestAsync(
        long requestId,
        string note,
        long userId,
        string userName);

    Task RejectRequestAsync(
        long requestId,
        string note,
        long userId,
        string userName);


    //===========================================================
    // Definitions (admin)
    //===========================================================

    Task<long> CreateAsync(
        CreateSystemConfigurationsDto dto,
        long userId,
        string userName);

    Task UpdateAsync(
        UpdateSystemConfigurationsDto dto,
        long userId,
        string userName);

    Task DeleteAsync(
        long id,
        long userId,
        string userName);

    Task<bool> RestoreAsync(
        long userId,
        string userName);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}