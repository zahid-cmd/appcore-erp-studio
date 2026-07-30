//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.Module.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Module.Interfaces;

//===============================================================
// Navigation Module Repository Interface
//===============================================================

public interface INavigationModuleRepository
{
    //===============================================================
    // Get All
    //===============================================================

    Task<List<NavigationModuleDto>> GetAllAsync();

    //===============================================================
    // Get By Id
    //===============================================================

    Task<NavigationModuleDto?> GetByIdAsync(
        long id);

    //===============================================================
    // Get Next Code
    //===============================================================

    Task<string> GetNextCodeAsync();

    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    Task<int> GetSuggestedDisplayOrderAsync();

    //===============================================================
    // Get Defaults
    //===============================================================

    Task<NavigationModuleDefaultsDto> GetDefaultsAsync();

    //===============================================================
    // Create
    //===============================================================

    Task<long> CreateAsync(
        CreateNavigationModuleDto dto,
        long userId);

    //===============================================================
    // Update
    //===============================================================

    Task UpdateAsync(
        UpdateNavigationModuleDto dto,
        long userId);

    //===============================================================
    // Delete
    //===============================================================

    Task DeleteAsync(
        long id,
        long userId);

    //===============================================================
    // Exists
    //===============================================================

    Task<bool> ExistsAsync(
        long id);

    //===============================================================
    // Restore
    //===============================================================

    Task<bool> RestoreAsync(
        long userId);

    //===============================================================
    // Module Name Exists
    //===============================================================

    Task<bool> ModuleNameExistsAsync(
        string name,
        long? excludeId = null);

    //===============================================================
    // Route Key Exists
    //===============================================================

    Task<bool> RouteKeyExistsAsync(
        string routeKey,
        long? excludeId = null);

    //===============================================================
    // Display Order Exists
    //===============================================================

    Task<bool> DisplayOrderExistsAsync(
        int displayOrder,
        long? excludeId = null);
}