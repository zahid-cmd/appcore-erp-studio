//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.DTOs;


//===============================================================
// Login Request DTO
//===============================================================

public class LoginRequestDto
{
    //===========================================================
    // User Name
    //===========================================================

    public string UserName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Password
    //===========================================================

    public string Password
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Remember Me
    //===========================================================
    // Controls whether the backend should create a persistent
    // authentication session/token for the user.
    //===========================================================

    public bool RememberMe
    {
        get;
        set;
    }
}