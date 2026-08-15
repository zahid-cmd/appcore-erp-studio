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
// Frontend Code Synchronization Engine Interface
//===============================================================

public interface IFrontendCodeSynchronizationEngine
{

    //===========================================================
    // Synchronize
    //===========================================================

    Task<FrontendCodeSynchronizationResultDto>
        SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    );



    //===========================================================
    // Rollback
    //===========================================================

    Task<FrontendCodeSynchronizationResultDto>
        RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    );

}