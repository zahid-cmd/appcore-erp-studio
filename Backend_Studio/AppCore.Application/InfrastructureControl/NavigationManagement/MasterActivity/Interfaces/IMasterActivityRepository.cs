//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;

//===============================================================
// Master Activity Repository Interface
//===============================================================

public interface IMasterActivityRepository
{
    //===============================================================
    // Read
    //===============================================================

    Task<List<MasterActivityDto>> GetAllAsync();

    Task<MasterActivityDto?> GetByIdAsync(
        long id);

    Task<MasterActivityDefaultsDto> GetDefaultsAsync();

    Task<bool> ExistsAsync(
        long id);

    //===============================================================
    // Write
    //===============================================================

    Task<long> CreateAsync(
        CreateMasterActivityDto dto,
        long userId);

    Task UpdateAsync(
        UpdateMasterActivityDto dto,
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