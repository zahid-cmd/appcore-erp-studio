//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.DTOs;


//===============================================================
// Forgot Password Request DTO
// --------------------------------------------------------------
// Legacy request DTO.
// This can remain temporarily while the new two-step
// password reset flow is being implemented.
//===============================================================

public class ForgotPasswordRequestDto
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
    // New Password
    //===========================================================

    public string NewPassword
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// Forgot Password Check Request DTO
// --------------------------------------------------------------
// Step 1:
// Login ID is submitted to check whether the account is
// available and active for password recovery.
//===============================================================

public class ForgotPasswordCheckRequestDto
{
    //===========================================================
    // User Name
    //===========================================================

    public string UserName
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// Forgot Password Check Response DTO
// --------------------------------------------------------------
// Step 1 response.
// The verification code is returned to the Forget Password
// Panel and displayed in its disabled verification field.
//===============================================================

public class ForgotPasswordCheckResponseDto
{
    //===========================================================
    // Success
    //===========================================================

    public bool Success
    {
        get;
        set;
    }


    //===========================================================
    // Message
    //===========================================================

    public string Message
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Verification Code
    //===========================================================

    public string VerificationCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Verification Expiration
    //===========================================================

    public DateTime? ExpiresAt
    {
        get;
        set;
    }


    //===========================================================
    // User Profile ID
    //===========================================================

    public long UserProfileId
    {
        get;
        set;
    }
}


//===============================================================
// Forgot Password Confirm Request DTO
// --------------------------------------------------------------
// Step 2:
// The Forget Password Panel submits the Login ID, automatically
// populated verification code, and new password.
//===============================================================

public class ForgotPasswordConfirmRequestDto
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
    // Verification Code
    //===========================================================

    public string VerificationCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // New Password
    //===========================================================

    public string NewPassword
    {
        get;
        set;
    } = string.Empty;
}