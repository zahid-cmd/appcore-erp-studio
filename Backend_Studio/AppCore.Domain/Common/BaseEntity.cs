//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Common;

//===============================================================
// Base Entity
//===============================================================

public abstract class BaseEntity
{
    //===============================================================
    // Primary Key
    //===============================================================

    public long Id
    {
        get;
        set;
    }

    //===============================================================
    // Status
    //===============================================================

    public bool IsActive
    {
        get;
        set;
    } = true;

    public bool IsDeleted
    {
        get;
        set;
    } = false;

    //===============================================================
    // Audit Information
    //===============================================================

    public long? CreatedBy
    {
        get;
        set;
    }

    public DateTime CreatedDate
    {
        get;
        set;
    } = DateTime.UtcNow;

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
}