//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.Interfaces;

//===============================================================
// Navigation Submenu Repository Interface
//===============================================================

public interface INavigationSubmenuRepository
{
    //===============================================================
    // Get All
    //===============================================================

    Task<List<NavigationSubmenuDto>> GetAllAsync();

    //===============================================================
    // Get By Id
    //===============================================================

    Task<NavigationSubmenuDto?> GetByIdAsync(
        long id);

    //===============================================================
    // Get By Menu
    //===============================================================

    Task<List<NavigationSubmenuDto>> GetByMenuAsync(
        long navigationMenuId);

    //===============================================================
    // Create
    //===============================================================

    Task<long> CreateAsync(
        CreateNavigationSubmenuDto dto,
        long userId);

    //===============================================================
    // Update
    //===============================================================

    Task UpdateAsync(
        UpdateNavigationSubmenuDto dto,
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
        long navigationMenuId,
        string routeKey,
        long? excludeId = null);

    //===============================================================
    // Get Next Code
    //===============================================================

    Task<string> GetNextCodeAsync(
        long navigationMenuId);

    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    Task<int> GetSuggestedDisplayOrderAsync(
        long navigationMenuId);

    //===============================================================
    // Get Defaults
    //===============================================================

    Task<NavigationSubmenuDefaultsDto> GetDefaultsAsync(
        long navigationMenuId);
}