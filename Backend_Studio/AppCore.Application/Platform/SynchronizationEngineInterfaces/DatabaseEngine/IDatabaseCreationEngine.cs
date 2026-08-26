//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Database Creation Engine
//===============================================================

public interface IDatabaseCreationEngine
{

    //===========================================================
    // Create Database
    //===========================================================

    Task CreateAsync
    (
        long codeSynchronizationId
    );

}