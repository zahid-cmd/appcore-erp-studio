//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

//===============================================================
// Module Synchronization Repository Interface
//===============================================================

public interface IModuleSynchronizationRepository
{
    //===========================================================
    // Get Defaults
    //===========================================================

    Task<ModuleSynchronizationDefaultsDto> GetDefaultsAsync
    (
        string synchronizationType
    );

    //===========================================================
    // Get All
    //===========================================================

    Task<List<ModuleSynchronizationDto>> GetAllAsync
    (
        string synchronizationType
    );

    //===========================================================
    // Get By Id
    //===========================================================

    Task<ModuleSynchronizationDto?> GetByIdAsync
    (
        long id
    );

    //===========================================================
    // Analyze
    //===========================================================

    Task<ModuleSynchronizationDto> AnalyzeAsync
    (
        long moduleId,

        string synchronizationType
    );

    //===========================================================
    // Synchronize
    //===========================================================

    Task<bool> SynchronizeAsync
    (
        long id
    );

    //===========================================================
    // Rollback
    //===========================================================

    Task<bool> RollbackAsync
    (
        long id
    );
    
    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync
    (
        CreateModuleSynchronizationDto dto
    );

    //===========================================================
    // Update
    //===========================================================

    Task<bool> UpdateAsync
    (
        UpdateModuleSynchronizationDto dto
    );

    //===========================================================
    // Delete
    //===========================================================

    Task<bool> DeleteAsync
    (
        long id
    );

    //===========================================================
    // Restore
    //===========================================================

    Task<bool> RestoreAsync
    (
        string synchronizationType
    );

    //===========================================================
    // Exists By Module
    //===========================================================

    Task<bool> ExistsByModuleAsync
    (
        long moduleId,

        string synchronizationType,

        long? excludeId = null
    );
}