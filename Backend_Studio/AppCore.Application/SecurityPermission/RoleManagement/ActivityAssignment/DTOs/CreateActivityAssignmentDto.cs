//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Create Activity Assignment DTO
//===============================================================

public class CreateActivityAssignmentDto
{
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
    =
    true;

    /* =====================================================
       DETAILS
    ===================================================== */

    public List<CreateActivityAssignmentDetailDto>
        Details
    {
        get;
        set;
    }
    =
    new();
}