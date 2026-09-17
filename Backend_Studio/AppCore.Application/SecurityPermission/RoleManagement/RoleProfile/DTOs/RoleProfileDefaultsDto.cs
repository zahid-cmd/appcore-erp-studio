//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.RoleProfile.DTOs;


//===============================================================
// Role Profile Defaults DTO
//===============================================================

public class RoleProfileDefaultsDto
{
    //===========================================================
    // Profile Code
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Suggested Display Order
    //===========================================================

    public int DisplayOrder
    {
        get;
        set;
    }
}