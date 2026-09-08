//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Database Migration Engine Interface
//===============================================================

public interface IDatabaseMigrationEngine
{
    Task CreateAsync
    (
        long submenuId,

        string entityName
    );

    Task RemoveAsync
    (
        long submenuId
    );
}