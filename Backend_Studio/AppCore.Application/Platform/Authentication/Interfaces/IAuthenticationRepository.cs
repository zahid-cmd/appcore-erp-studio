//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Authentication.DTOs;

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
    // Get Active Branch Assignments By User Profile ID
    //===========================================================
    // Returns the active branches assigned to the specified
    // user profile for login branch selection.
    //===========================================================

    Task<List<LoginBranchDto>>
        GetActiveBranchAssignmentsByUserProfileIdAsync(
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


    //===========================================================
    // Switch Branch (2026-11-07)
    //===========================================================

    // The user by id (null when missing)
    Task<UserProfile?> GetUserProfileByIdAsync(
        long userProfileId);

    // Wing name and business lines in force today per branch
    Task<Dictionary<long, (string WingName, List<string> Lines)>>
        GetBranchSwitchDetailsAsync(
            IEnumerable<long> branchIds);

    // Setting "Allow Branch Switch Without Re-login" (missing = ON)
    Task<bool> IsBranchSwitchAllowedAsync();

    // A line in Activity History (Security & Permission ·
    // BranchSwitch)
    Task AddBranchSwitchHistoryAsync(
        long userProfileId,
        string userName,
        LoginBranchDto? fromBranch,
        LoginBranchDto toBranch);
}
