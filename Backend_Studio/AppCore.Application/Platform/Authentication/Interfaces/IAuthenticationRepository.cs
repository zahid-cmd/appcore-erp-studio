//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Platform.Authentication;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.Interfaces;


//===============================================================
// Authentication Repository Interface
//===============================================================

public interface IAuthenticationRepository
{
    //===========================================================
    // Get User Profile By User Name
    //===========================================================

    Task<UserProfile?> GetUserProfileByUserNameAsync(
        string userName);


    //===========================================================
    // Get User Credential By User Profile ID
    //===========================================================

    Task<UserCredential?> GetUserCredentialByUserProfileIdAsync(
        long userProfileId);


    //===========================================================
    // Create Registration
    //===========================================================

    Task<long> CreateRegistrationAsync(
        UserProfile userProfile,
        UserCredential userCredential);


    //===========================================================
    // Update User Credential
    //===========================================================

    Task UpdateCredentialAsync(
        UserCredential userCredential);


    //===========================================================
    // Ensure User Credential
    //===========================================================

    Task<UserCredential> EnsureUserCredentialAsync(
        long userProfileId);


    //===========================================================
    // Invalidate Password Reset Verifications
    //===========================================================

    Task InvalidatePasswordResetVerificationsAsync(
        long userProfileId);


    //===========================================================
    // Create Password Reset Verification
    //===========================================================

    Task<PasswordResetVerification>
        CreatePasswordResetVerificationAsync(
            PasswordResetVerification verification);


    //===========================================================
    // Get Active Password Reset Verification
    //===========================================================

    Task<PasswordResetVerification?>
        GetActivePasswordResetVerificationAsync(
            long userProfileId);


    //===========================================================
    // Increment Password Reset Attempt
    //===========================================================

    Task IncrementPasswordResetAttemptAsync(
        PasswordResetVerification verification);


    //===========================================================
    // Mark Password Reset Verification Used
    //===========================================================

    Task MarkPasswordResetVerificationUsedAsync(
        PasswordResetVerification verification);
}