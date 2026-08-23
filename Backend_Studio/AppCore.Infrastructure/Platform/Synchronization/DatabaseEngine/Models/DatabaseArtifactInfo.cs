//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared.Models;


//===============================================================
// Database Artifact Information
//===============================================================

public class DatabaseArtifactInfo
{

    //===========================================================
    // Submenu Code
    //===========================================================

    public string SubmenuCode
    {
        get;
        set;
    } = null!;



    //===========================================================
    // Normalized Migration Key
    //===========================================================

    public string NormalizedMigrationKey
    {
        get;
        set;
    } = null!;



    //===========================================================
    // Migration
    //===========================================================

    public DatabaseMigrationInfo Migration
    {
        get;
        set;
    } = null!;



    //===========================================================
    // Snapshot File Path
    //===========================================================

    public string SnapshotFilePath
    {
        get;
        set;
    } = null!;



    //===========================================================
    // Snapshot Section Exists
    //===========================================================

    public bool SnapshotSectionExists
    {
        get;
        set;
    }



    //===========================================================
    // Table
    //===========================================================

    public DatabaseTableInfo Table
    {
        get;
        set;
    } = null!;

}