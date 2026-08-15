//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.CodeSynchronizationEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.CodeSynchronizationEngine;


//===============================================================
// Backend Code Synchronization Engine
//===============================================================

public class BackendCodeSynchronizationEngine
    : IBackendCodeSynchronizationEngine
{

    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<BackendCodeSynchronizationResultDto>
        SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        await Task.CompletedTask;

        return new BackendCodeSynchronizationResultDto
        {
            Success =
                false,

            Message =
                "Backend code synchronization is not implemented yet."
        };
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<BackendCodeSynchronizationResultDto>
        RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        await Task.CompletedTask;

        return new BackendCodeSynchronizationResultDto
        {
            Success =
                false,

            Message =
                "Backend code rollback is not implemented yet."
        };
    }

}