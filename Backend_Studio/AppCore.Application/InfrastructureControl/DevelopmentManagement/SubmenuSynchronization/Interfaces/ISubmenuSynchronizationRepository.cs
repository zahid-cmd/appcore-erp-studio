//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Submenu Synchronization Repository Interface
//===============================================================

public interface ISubmenuSynchronizationRepository
{

    //===========================================================
    // Get Defaults
    //===========================================================

    Task<SubmenuSynchronizationDefaultsDto> GetDefaultsAsync
    (
        string synchronizationType
    );


    //===========================================================
    // Get All
    //===========================================================

    Task<List<SubmenuSynchronizationDto>> GetAllAsync
    (
        string synchronizationType
    );


    //===========================================================
    // Get By Id
    //===========================================================

    Task<SubmenuSynchronizationDto?> GetByIdAsync
    (
        long id
    );


    //===========================================================
    // Analyze
    //===========================================================

    Task<SubmenuSynchronizationDto> AnalyzeAsync
    (
        long moduleId,

        long menuId,

        long submenuId,

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
        CreateSubmenuSynchronizationDto dto
    );


    //===========================================================
    // Update
    //===========================================================

    Task<bool> UpdateAsync
    (
        UpdateSubmenuSynchronizationDto dto
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
    // Exists By Submenu
    //===========================================================

    Task<bool> ExistsBySubmenuAsync
    (
        long submenuId,

        string synchronizationType,

        long? excludeId = null
    );

}