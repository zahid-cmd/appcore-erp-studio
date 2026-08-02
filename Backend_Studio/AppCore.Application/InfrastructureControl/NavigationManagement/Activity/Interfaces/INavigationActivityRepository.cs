//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Activity.Interfaces;

//===============================================================
// Navigation Activity Repository Interface
//===============================================================

public interface INavigationActivityRepository
{
    //===============================================================
    // Read
    //===============================================================

    Task<List<NavigationActivityDto>> GetAllAsync(
        long? moduleId = null);

    Task<NavigationActivityDto?> GetByIdAsync(
        long id);

    Task<NavigationActivityDefaultsDto> GetDefaultsAsync(
        long? navigationModuleId = null);

    Task<bool> ExistsAsync(
        long id);

    //===============================================================
    // Write
    //===============================================================

    Task<long> CreateAsync(
        CreateNavigationActivityDto dto,
        long userId);

    Task UpdateAsync(
        UpdateNavigationActivityDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    //===============================================================
    // Restore
    //===============================================================

    Task<bool> RestoreAsync(
        long userId);
}