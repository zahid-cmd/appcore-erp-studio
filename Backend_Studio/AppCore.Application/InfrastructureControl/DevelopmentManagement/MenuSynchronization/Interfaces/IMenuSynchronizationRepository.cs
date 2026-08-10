//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Menu Synchronization Repository Interface
//===============================================================

public interface IMenuSynchronizationRepository
{

    //===========================================================
    // Get Defaults
    //===========================================================

    Task<MenuSynchronizationDefaultsDto> GetDefaultsAsync
    (
        string synchronizationType
    );



    //===========================================================
    // Get All
    //===========================================================

    Task<List<MenuSynchronizationDto>> GetAllAsync
    (
        string synchronizationType
    );



    //===========================================================
    // Get By Id
    //===========================================================

    Task<MenuSynchronizationDto?> GetByIdAsync
    (
        long id
    );



    //===========================================================
    // Analyze
    //===========================================================

    Task<MenuSynchronizationDto> AnalyzeAsync
    (
        long moduleId,

        long menuId,

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
    // Rollback Validation
    //===========================================================
    //
    // Checks whether the Menu can safely be rolled back.
    //
    // This does NOT execute rollback.
    //
    // The validation checks for dependent Submenu data.
    //
    //===========================================================

    Task<MenuSynchronizationRollbackValidationDto?>
        ValidateRollbackAsync
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
        CreateMenuSynchronizationDto dto
    );



    //===========================================================
    // Update
    //===========================================================

    Task<bool> UpdateAsync
    (
        UpdateMenuSynchronizationDto dto
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
    // Exists By Menu
    //===========================================================

    Task<bool> ExistsByMenuAsync
    (
        long menuId,

        string synchronizationType,

        long? excludeId = null
    );

}