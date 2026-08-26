//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Database Initialization Context
//===============================================================

public class DatabaseInitializationContext
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
    // Backend Solution
    //===========================================================

    public string BackendSolutionPath
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Backend Infrastructure Project
    //===========================================================

    public string BackendInfrastructureProjectPath
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Backend Startup Project
    //===========================================================

    public string BackendStartupProjectPath
    {
        get;
        set;
    } = string.Empty;

}