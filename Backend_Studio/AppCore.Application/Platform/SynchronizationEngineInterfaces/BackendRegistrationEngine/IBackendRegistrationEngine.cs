//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendRegistrationEngine;


//===============================================================
// Backend Registration Engine Interface
//===============================================================

public interface IBackendRegistrationEngine
{

    //===========================================================
    // Register
    //===========================================================

    Task<BackendRegistrationResultDto>
        RegisterAsync
    (
        SubmenuSynchronizationDto synchronization
    );



    //===========================================================
    // Rollback
    //===========================================================

    Task<BackendRegistrationResultDto>
        RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    );

}