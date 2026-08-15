//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.CodeSynchronizationEngine;


//===============================================================
// Backend Code Synchronization Engine Interface
//===============================================================

public interface IBackendCodeSynchronizationEngine
{

    //===========================================================
    // Synchronize
    //===========================================================

    Task<BackendCodeSynchronizationResultDto>
        SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    );



    //===========================================================
    // Rollback
    //===========================================================

    Task<BackendCodeSynchronizationResultDto>
        RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    );

}