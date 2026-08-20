//===============================================================
// Namespace
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendDatabaseEngine;


//===============================================================
// Backend Database Engine Interface
//===============================================================

public interface IBackendDatabaseEngine
{

    //===========================================================
    // Create Database
    //===========================================================

    Task<BackendDatabaseResultDto>
        CreateAsync
        (
            long codeSynchronizationId
        );


    //===========================================================
    // Remove Database
    //===========================================================

    Task<BackendDatabaseResultDto>
        RemoveAsync
        (
            long codeSynchronizationId
        );

}