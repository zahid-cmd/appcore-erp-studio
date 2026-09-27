//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.DTOs;



//===============================================================
// Login Response DTO
//===============================================================

public class LoginResponseDto
{
    //===========================================================
    // Authentication Status
    //===========================================================

    public bool Success
    {
        get;
        set;
    }



    //===========================================================
    // Response Message
    //===========================================================

    public string Message
    {
        get;
        set;
    } = string.Empty;



    //===========================================================
    // Authentication Token
    //===========================================================

    public string Token
    {
        get;
        set;
    } = string.Empty;



    //===========================================================
    // User Profile ID
    //===========================================================

    public long UserProfileId
    {
        get;
        set;
    }



    //===========================================================
    // User Name
    //===========================================================

    public string UserName
    {
        get;
        set;
    } = string.Empty;



    //===========================================================
    // Display Name
    //===========================================================

    public string DisplayName
    {
        get;
        set;
    } = string.Empty;



    //===========================================================
    // Full Name
    // ----------------------------------------------------------
    // Full legal/user name used for authenticated user display.
    //
    // This value is used by the application Topbar to display
    // the currently logged-in user's Full Name.
    //===========================================================

    public string FullName
    {
        get;
        set;
    } = string.Empty;
}