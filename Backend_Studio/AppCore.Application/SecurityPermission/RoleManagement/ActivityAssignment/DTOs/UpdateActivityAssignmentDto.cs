//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Update Activity Assignment DTO
//===============================================================

public class UpdateActivityAssignmentDto
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
    }

    /* =====================================================
       DETAILS
    ===================================================== */

    public List<UpdateActivityAssignmentDetailDto>
        Details
    {
        get;
        set;
    }
    =
    new();
}