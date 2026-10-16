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
//===============================================================

public interface ISystemConfigurationsRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<SystemConfigurationsDto>> GetAllAsync();

    Task<SystemConfigurationsDto?> GetByIdAsync(
        long id);

    Task<string> GetNextCodeAsync(
        long navigationModuleId);

    Task<SystemConfigurationsDefaultsDto> GetDefaultsAsync(
        long navigationModuleId);


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateSystemConfigurationsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateSystemConfigurationsDto dto,
        long userId);

    Task SetEnabledAsync(
        long id,
        bool isEnabled,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}