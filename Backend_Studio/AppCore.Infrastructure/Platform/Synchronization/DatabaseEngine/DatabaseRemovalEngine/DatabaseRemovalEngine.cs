//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseRemovalEngine;


//===============================================================
// Database Removal Engine
//===============================================================

public class DatabaseRemovalEngine
    : IDatabaseRemovalEngine
{

    //===========================================================
    // Remove Database
    //===========================================================

    public Task RemoveDatabaseAsync
    (
        long codeSynchronizationId
    )
    {
        return Task.CompletedTask;
    }

}