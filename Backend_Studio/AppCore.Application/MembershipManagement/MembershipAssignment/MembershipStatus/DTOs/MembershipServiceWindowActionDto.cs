//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Mark a free service window used (manual)
//===============================================================

public class UseMembershipServiceDto
{
    public DateOnly UsedDate
    {
        get;
        set;
    }


    // e.g. job card / slip no
    public string Reference
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// Approve a missed free service window
//===============================================================

public class ApproveMembershipServiceDto
{
    public string Reason
    {
        get;
        set;
    } = string.Empty;
}