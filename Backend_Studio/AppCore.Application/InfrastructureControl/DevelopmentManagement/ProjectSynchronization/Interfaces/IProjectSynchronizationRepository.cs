//===============================================================
// Imports
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.Interfaces;


//===============================================================
// Project Synchronization Repository
//===============================================================

public interface IProjectSynchronizationRepository
{
    //===========================================================
    // CRUD
    //===========================================================

    Task<List<ProjectSynchronizationDto>> GetAllAsync();

    Task<ProjectSynchronizationDto?> GetByIdAsync(
        long id);

    Task<ProjectSynchronizationDefaultsDto> GetDefaultsAsync();

    Task<long> CreateAsync(
        CreateProjectSynchronizationDto dto,
        long userId);

    Task UpdateAsync(
        UpdateProjectSynchronizationDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // History
    //===========================================================

    Task<List<ActivityHistoryDto>> GetHistoryAsync();


    //===========================================================
    // Navigation Lookup (Available)
    //===========================================================

    Task<List<ModuleDto>> GetModulesAsync();

    Task<List<MenuDto>> GetMenusAsync();

    Task<List<SubmenuDto>> GetSubmenusAsync();


    //===========================================================
    // Navigation Lookup (All)
    //===========================================================

    Task<List<ModuleDto>> GetAllModulesAsync();

    Task<List<MenuDto>> GetAllMenusAsync();

    Task<List<SubmenuDto>> GetAllSubmenusAsync();
}