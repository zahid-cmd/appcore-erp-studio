//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.UserManagement;


//===============================================================
// Branch Assignment
//===============================================================

public class BranchAssignment
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

    public long BranchAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // User Profile
    //===========================================================

    public long UserProfileId
    {
        get;
        set;
    }


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    }
    =
        true;


    public bool IsDeleted
    {
        get;
        set;
    }
    =
        false;


    //===========================================================
    // Delete Audit
    //===========================================================

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
    // Create Audit
    //===========================================================

    public long? CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }
    =
        DateTime.UtcNow;


    //===========================================================
    // Modify Audit
    //===========================================================

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


    //===========================================================
    // Details
    //===========================================================

    public virtual ICollection<BranchAssignmentDetail>
        Details
    {
        get;
        set;
    }
    =
        new List<BranchAssignmentDetail>();
}


//===============================================================
// Branch Assignment Detail
//===============================================================

public class BranchAssignmentDetail
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long BranchAssignmentDetailId
    {
        get;
        set;
    }


    //===========================================================
    // Branch Assignment
    //===========================================================

    public long BranchAssignmentId
    {
        get;
        set;
    }


    //===========================================================
    // Branch
    //===========================================================

    public long BranchId
    {
        get;
        set;
    }


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    }
    =
        true;


    public bool IsDeleted
    {
        get;
        set;
    }
    =
        false;


    //===========================================================
    // Delete Audit
    //===========================================================

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
    // Create Audit
    //===========================================================

    public long? CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }
    =
        DateTime.UtcNow;


    //===========================================================
    // Modify Audit
    //===========================================================

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


    //===========================================================
    // Branch Assignment
    //===========================================================

    public virtual BranchAssignment
        BranchAssignment
    {
        get;
        set;
    }
    =
        null!;
}