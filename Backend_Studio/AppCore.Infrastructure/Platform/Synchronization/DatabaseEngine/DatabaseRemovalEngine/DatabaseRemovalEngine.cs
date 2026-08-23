//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine;


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
        //=======================================================
        // Validate Synchronization Id
        //=======================================================

        if
        (
            codeSynchronizationId <= 0
        )
        {
            throw new InvalidOperationException(
                "A valid Code Synchronization Id is required."
            );
        }


        //=======================================================
        // Database Removal
        //=======================================================
        //
        // The actual migration rollback and removal logic will
        // be added after the basic Database Engine structure is
        // compiling successfully.
        //
        //=======================================================

        return Task.CompletedTask;
    }

}