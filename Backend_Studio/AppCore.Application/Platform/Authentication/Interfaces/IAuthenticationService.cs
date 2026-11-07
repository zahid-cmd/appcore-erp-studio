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


    //===========================================================
    // Switch Branch (user menu, 2026-11-07)
    //===========================================================
    //
    // My branches : the active branches of the user's Branch
    // Assignment (the login rule) with wing and business lines,
    // the current one marked, and whether switching is allowed.
    //
    // Switch : re-checks the user, the login, the setting and the
    // assignment, then issues a new token for the branch with the
    // given expiry (the current session's; null = a fresh 8 hours).
    //===========================================================

    Task<MyBranchesDto> GetMyBranchesAsync(
        long userProfileId,
        long currentBranchId);

    Task<LoginResponseDto> SwitchBranchAsync(
        long userProfileId,
        long currentBranchId,
        SwitchBranchRequestDto request,
        DateTime? expiresUtc);
}
