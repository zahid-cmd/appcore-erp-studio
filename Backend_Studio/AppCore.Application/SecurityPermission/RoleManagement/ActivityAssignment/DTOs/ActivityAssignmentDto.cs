//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Activity Assignment DTO
//===============================================================

public class ActivityAssignmentDto
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

    public string RoleProfileName
    {
        get;
        set;
    }
    =
    string.Empty;

    /* =====================================================
       SUMMARY
    ===================================================== */

    public int PageCount
    {
        get;
        set;
    }

    public int MasterActivityCount
    {
        get;
        set;
    }

    public int SpecialActivityCount
    {
        get;
        set;
    }

    public int TotalActivityCount
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
    }

    /* =====================================================
       DETAILS
    ===================================================== */

    public List<ActivityAssignmentDetailDto>
        Details
    {
        get;
        set;
    }
    =
    new();
}