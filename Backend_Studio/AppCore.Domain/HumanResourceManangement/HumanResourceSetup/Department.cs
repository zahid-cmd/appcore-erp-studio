//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Department
//===============================================================

public class Department
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
    // The wing the department belongs to (null : none). Hand-added
    // 2026-11-16 : the technicians of Workshop Configuration are the
    // employees of the departments under the Service Center wing.
    //===========================================================

    public long? WingId
    {
        get;
        set;
    }


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