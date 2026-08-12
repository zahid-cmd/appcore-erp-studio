//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Code Synchronization Repository Interface
//===============================================================

public interface ICodeSynchronizationRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<List<CodeSynchronizationDto>>
        GetAllAsync
        (
            string synchronizationType
        );


    //===========================================================
    // Get By Id
    //===========================================================

    Task<CodeSynchronizationDto?>
        GetByIdAsync
        (
            long id
        );


    //===========================================================
    // Synchronize Code
    //===========================================================

    Task<bool>
        SynchronizeAsync
        (
            long id
        );


    //===========================================================
    // Rollback Code Synchronization
    //===========================================================

    Task<bool>
        RollbackAsync
        (
            long id
        );


    //===========================================================
    // Get List History
    //===========================================================

    Task<List<CodeSynchronizationDto>>
        GetHistoryAsync();


    //===========================================================
    // Create From Submenu Synchronization
    //===========================================================

    Task<long>
        CreateFromSubmenuSynchronizationAsync
        (
            long submenuSynchronizationId
        );

}