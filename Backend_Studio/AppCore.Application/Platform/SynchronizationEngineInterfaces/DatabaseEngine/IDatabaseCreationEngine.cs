//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Database Creation Engine Interface
//===============================================================

public interface IDatabaseCreationEngine
{
    //===========================================================
    // Create Database
    //===========================================================

    Task CreateDatabaseAsync
    (
        long codeSynchronizationId
    );
}