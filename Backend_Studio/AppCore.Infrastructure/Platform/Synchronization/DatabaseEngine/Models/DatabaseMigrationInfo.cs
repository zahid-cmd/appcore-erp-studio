//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Database Migration Info
//===============================================================

public class DatabaseMigrationInfo
{

    //===========================================================
    // Migration
    //===========================================================

    public string MigrationKey
    {
        get;
        set;
    } = string.Empty;


    public string MigrationName
    {
        get;
        set;
    } = string.Empty;


    public string? MigrationId
    {
        get;
        set;
    }


    //===========================================================
    // Migration Files
    //===========================================================

    public bool MigrationExists
    {
        get;
        set;
    }


    public bool DesignerExists
    {
        get;
        set;
    }


    //===========================================================
    // Migration State
    //===========================================================

    public bool IsRegistered
    {
        get;
        set;
    }


    public bool IsApplied
    {
        get;
        set;
    }

}