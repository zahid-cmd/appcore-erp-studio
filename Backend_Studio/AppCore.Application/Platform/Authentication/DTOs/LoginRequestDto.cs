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


    //===========================================================
    // Branch ID
    //===========================================================
    // Optional during the first login request.
    //
    // If the user has only one active assigned branch, the
    // backend automatically selects that branch.
    //
    // If the user has multiple active assigned branches, the
    // frontend sends the selected Branch ID in the next login
    // request.
    //===========================================================

    public long? BranchId
    {
        get;
        set;
    }
}