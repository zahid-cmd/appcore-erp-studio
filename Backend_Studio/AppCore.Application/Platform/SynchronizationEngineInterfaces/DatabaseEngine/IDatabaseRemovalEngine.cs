//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Database Removal Engine Interface
//===============================================================

public interface IDatabaseRemovalEngine
{
    //===========================================================
    // Remove Database
    //===========================================================

    Task RemoveDatabaseAsync
    (
        long codeSynchronizationId
    );
}