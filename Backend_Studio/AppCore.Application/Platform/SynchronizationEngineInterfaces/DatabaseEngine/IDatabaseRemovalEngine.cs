//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Database Removal Engine
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