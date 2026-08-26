//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Database Artifact Identity
//===============================================================

public class DatabaseArtifactIdentity
{

    //===========================================================
    // Synchronization
    //===========================================================

    public long SynchronizationId
    {
        get;
        set;
    }


    //===========================================================
    // Submenu
    //===========================================================

    public string SubmenuCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Entity
    //===========================================================

    public string EntityName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Database
    //===========================================================

    public string? Schema
    {
        get;
        set;
    }


    public string TableName
    {
        get;
        set;
    } = string.Empty;


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

}