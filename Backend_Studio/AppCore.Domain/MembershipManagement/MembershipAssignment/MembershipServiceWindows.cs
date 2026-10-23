//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Service Windows (manual entity : not generated)
//
// One free service per window. A window not used by its ToDate is
// Missed; it can be given later only when approved. Windows never move.
//===============================================================

public class MembershipServiceWindows
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MembershipServiceWindowId
    {
        get;
        set;
    }


    //===========================================================
    // Window
    //===========================================================

    public long MembershipId
    {
        get;
        set;
    }


    public int WindowNo
    {
        get;
        set;
    }


    public DateOnly FromDate
    {
        get;
        set;
    }


    public DateOnly ToDate
    {
        get;
        set;
    }


    // Unused service carried over from the upgraded card
    public bool IsCarriedOver
    {
        get;
        set;
    }


    //===========================================================
    // Use (manual until job cards exist)
    //===========================================================

    public DateOnly? UsedDate
    {
        get;
        set;
    }


    public string UsedReference
    {
        get;
        set;
    } = string.Empty;


    public long? UsedBy
    {
        get;
        set;
    }


    //===========================================================
    // Late approval of a missed window
    //===========================================================

    public bool IsApproved
    {
        get;
        set;
    }


    public DateOnly? ApprovedDate
    {
        get;
        set;
    }


    public long? ApprovedBy
    {
        get;
        set;
    }


    public string ApprovalReason
    {
        get;
        set;
    } = string.Empty;


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