//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Authentication.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.Interfaces;


//===============================================================
// Authentication Service Interface
//===============================================================

public interface IAuthenticationService
{
    //===========================================================
    // Login
    //===========================================================

    Task<LoginResponseDto> LoginAsync(
        LoginRequestDto request);


    //===========================================================
    // Register
    //===========================================================

    Task<LoginResponseDto> RegisterAsync(
        RegisterRequestDto request);


    //===========================================================
    // Check Forgot Password
    //===========================================================

    Task<ForgotPasswordCheckResponseDto> CheckForgotPasswordAsync(
        ForgotPasswordCheckRequestDto request);


    //===========================================================
    // Confirm Forgot Password
    //===========================================================

    Task<LoginResponseDto> ConfirmForgotPasswordAsync(
        ForgotPasswordConfirmRequestDto request);


    //===========================================================
    // Validate Current Password
    //===========================================================
    //
    // Verifies the authenticated user's current password.
    //
    // This is used for live validation before the user proceeds
    // to the New Password field.
    //
    // This method DOES NOT change the password.
    //===========================================================

    Task<ValidateCurrentPasswordResponseDto>
        ValidateCurrentPasswordAsync(
            ValidateCurrentPasswordRequestDto request);


    //===========================================================
    // Change Password
    //===========================================================
    //
    // Verifies the authenticated user's current password and
    // saves the new password.
    //===========================================================

    Task<ChangePasswordResponseDto> ChangePasswordAsync(
        ChangePasswordRequestDto request);
}