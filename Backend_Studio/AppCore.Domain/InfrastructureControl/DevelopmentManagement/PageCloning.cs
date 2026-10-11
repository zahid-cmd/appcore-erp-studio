//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Page Cloning
//===============================================================

public class PageCloning
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long PageCloningId
    {
        get;
        set;
    }


    //===========================================================
    // Clone From (Source Submenu)
    //===========================================================

    public long CloneFromId
    {
        get;
        set;
    }


    public string CloneFromCode
    {
        get;
        set;
    } = string.Empty;


    public string CloneFromName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Clone To (Target Submenu)
    //===========================================================

    public long CloneToId
    {
        get;
        set;
    }


    public string CloneToCode
    {
        get;
        set;
    } = string.Empty;


    public string CloneToName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Blueprint
    //===========================================================

    public string EntityName
    {
        get;
        set;
    } = string.Empty;


    public string BlueprintJson
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Clone Run
    //===========================================================

    public int NumberOfFiles
    {
        get;
        set;
    } = 15;


    public string RunStatus
    {
        get;
        set;
    } = "Draft";


    public DateTime? LastRunDate
    {
        get;
        set;
    }


    public string BuildOutput
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    } = false;


    public long? DeletedBy
    {
        get;
        set;
    }


    public DateTime? DeletedDate
    {
        get;
        set;
    }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }


    public long? ModifiedBy
    {
        get;
        set;
    }


    public DateTime? ModifiedDate
    {
        get;
        set;
    }
}