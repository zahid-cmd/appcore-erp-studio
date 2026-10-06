//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Department
//===============================================================

public class Department
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long DepartmentId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string DepartmentCode
    {
        get;
        set;
    } = string.Empty;


    public string DepartmentName
    {
        get;
        set;
    } = string.Empty;


    public string DepartmentShortName
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