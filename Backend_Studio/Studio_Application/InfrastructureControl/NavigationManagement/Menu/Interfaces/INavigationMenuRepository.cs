//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Menu.Interfaces;

//===============================================================
// Navigation Menu Repository Interface
//===============================================================

public interface INavigationMenuRepository
{
    //===============================================================
    // Get All
    //===============================================================

    Task<List<NavigationMenuDto>> GetAllAsync();

    //===============================================================
    // Get By Id
    //===============================================================

    Task<NavigationMenuDto?> GetByIdAsync(
        long id);

    //===============================================================
    // Get By Module
    //===============================================================

    Task<List<NavigationMenuDto>> GetByModuleAsync(
        long navigationModuleId);
        
    //===============================================================
    // Create
    //===============================================================

    Task<long> CreateAsync(
        CreateNavigationMenuDto dto,
        long userId);

    //===============================================================
    // Update
    //===============================================================

    Task UpdateAsync(
        UpdateNavigationMenuDto dto,
        long userId);

    //===============================================================
    // Delete
    //===============================================================

    Task DeleteAsync(
        long id,
        long userId);

    //===============================================================
    // Restore
    //===============================================================

    Task<bool> RestoreAsync(
        long userId);
        
    //===============================================================
    // Exists
    //===============================================================

    Task<bool> ExistsAsync(
        long id);
        
    //===============================================================
    // Route Key Exists
    //===============================================================

    Task<bool> RouteKeyExistsAsync(
        long navigationModuleId,
        string routeKey,
        long? excludeId = null);

    //===============================================================
    // Get Next Code
    //===============================================================

    Task<string> GetNextCodeAsync(
        long navigationModuleId);

    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    Task<int> GetSuggestedDisplayOrderAsync(
    long navigationModuleId);

    //===============================================================
    // Get Defaults
    //===============================================================

    Task<NavigationMenuDefaultsDto> GetDefaultsAsync(
        long navigationModuleId);
}