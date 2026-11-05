//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Designation
//===============================================================

public class Designation
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId
    {
        get;
        set;
    } = Guid.CreateVersion7();

    //===========================================================
    // Primary Key
    //===========================================================

    public long DesignationId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string DesignationCode
    {
        get;
        set;
    } = string.Empty;


    public string DesignationName
    {
        get;
        set;
    } = string.Empty;


    public string DesignationShortName
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