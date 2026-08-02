//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SecurityPermission.RoleManagement;

//===============================================================
// Activity Assignment
//===============================================================

public class ActivityAssignment
{
    /* =====================================================
       PRIMARY KEY
    ===================================================== */

    public long ActivityAssignmentId
    {
        get;
        set;
    }

    /* =====================================================
       ROLE PROFILE
    ===================================================== */

    public long RoleProfileId
    {
        get;
        set;
    }

    /* =====================================================
       STATUS
    ===================================================== */

    public bool IsActive
    {
        get;
        set;
    } = true;

    /* =====================================================
       SOFT DELETE
    ===================================================== */

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

    /* =====================================================
       AUDIT
    ===================================================== */

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

    /* =====================================================
       CHILDREN
    ===================================================== */

    public virtual ICollection<ActivityAssignmentDetail>
        Details
    {
        get;
        set;
    }
    =
    new List<ActivityAssignmentDetail>();
}