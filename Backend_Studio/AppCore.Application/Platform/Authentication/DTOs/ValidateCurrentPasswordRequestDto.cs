//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.Platform.Authentication.DTOs;


//===============================================================
// Validate Current Password Request DTO
//===============================================================

public class ValidateCurrentPasswordRequestDto
{
    //===========================================================
    // Login ID
    //===========================================================

    public string UserName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Current Password
    //===========================================================

    public string CurrentPassword
    {
        get;
        set;
    } = string.Empty;
}