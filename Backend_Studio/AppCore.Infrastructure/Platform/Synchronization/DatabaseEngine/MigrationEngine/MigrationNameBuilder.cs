//=============================================================== 
// Namespaces 
//=============================================================== 
 
using System; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine; 
 
 
//=============================================================== 
// Migration Name Builder 
//=============================================================== 
 
public class MigrationNameBuilder 
{ 
 
    //=========================================================== 
    // Build Migration Name 
    //=========================================================== 
 
    public string Build 
    ( 
        long submenuId, 
 
        string entityName 
    ) 
    { 
        if 
        ( 
            submenuId <= 0 
        ) 
        { 
            throw new ArgumentException 
            ( 
                "Submenu ID must be greater than zero.", 
                nameof(submenuId) 
            ); 
        } 
 
        if 
        ( 
            string.IsNullOrWhiteSpace(entityName) 
        ) 
        { 
            throw new ArgumentException 
            ( 
                "Entity name is required.", 
                nameof(entityName) 
            ); 
        } 
 
        var normalizedEntityName = 
            entityName.Trim(); 
 
        return 
            $"AutoSync_{submenuId}_{normalizedEntityName}"; 
    } 
}