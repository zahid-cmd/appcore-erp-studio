//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.Authentication.Interfaces;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;

using AppCore.Domain.Platform.Authentication;

using AppCore.Infrastructure.CodeMaster;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Authentication;


//===============================================================
// Authentication Repository
//===============================================================

public class AuthenticationRepository
    : IAuthenticationRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public AuthenticationRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Get User Profile By User Name
    //===========================================================

    public async Task<UserProfile?>
        GetUserProfileByUserNameAsync(
            string userName)
    {
        string normalizedUserName =
            userName?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                normalizedUserName)
        )
        {
            return null;
        }


        return await _context
            .Set<UserProfile>()

            .AsNoTracking()

            .FirstOrDefaultAsync
            (
                x =>

                    x.UserName ==
                    normalizedUserName

                    &&

                    !x.IsDeleted
            );
    }


    //===========================================================
    // Get User Credential By User Profile ID
    //===========================================================

    public async Task<UserCredential?>
        GetUserCredentialByUserProfileIdAsync(
            long userProfileId)
    {
        return await _context
            .Set<UserCredential>()

            .AsNoTracking()

            .FirstOrDefaultAsync
            (
                x =>

                    x.UserProfileId ==
                    userProfileId
            );
    }


    //===========================================================
    // Create Registration
    //===========================================================

    public async Task<long>
        CreateRegistrationAsync
        (
            UserProfile userProfile,

            UserCredential userCredential
        )
    {
        if
        (
            userProfile ==
            null
        )
        {
            throw new ArgumentNullException(
                nameof(userProfile)
            );
        }


        if
        (
            userCredential ==
            null
        )
        {
            throw new ArgumentNullException(
                nameof(userCredential)
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                userProfile.ProfileCode)
        )
        {
            userProfile.ProfileCode =
                await GetNextProfileCodeAsync();
        }


        userProfile.IsActive =
            false;


        userProfile.IsDeleted =
            false;


        userProfile.CreatedDate =
            DateTime.UtcNow;


        userCredential.UserProfileId =
            0;


        userCredential.CreatedDate =
            DateTime.UtcNow;


        await using Microsoft.EntityFrameworkCore.Storage
            .IDbContextTransaction transaction =
                await _context
                    .Database
                    .BeginTransactionAsync();


        try
        {
            _context
                .Set<UserProfile>()
                .Add(
                    userProfile
                );


            await _context.SaveChangesAsync();


            userCredential.UserProfileId =
                userProfile.UserProfileId;


            _context
                .Set<UserCredential>()
                .Add(
                    userCredential
                );


            await _context.SaveChangesAsync();


            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Security Permission",

                    EntityName =
                        "User Registration",

                    EntityId =
                        userProfile.UserProfileId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "User Registration Created",

                    ActivityDescription =
                        $"User registration '{userProfile.DisplayName}' created and is awaiting administrator activation.",

                    PerformedBy =
                        0,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            await transaction.CommitAsync();


            return userProfile.UserProfileId;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Update User Credential
    //===========================================================

    public async Task
        UpdateCredentialAsync(
            UserCredential userCredential)
    {
        if
        (
            userCredential ==
            null
        )
        {
            throw new ArgumentNullException(
                nameof(userCredential)
            );
        }


        //=======================================================
        // Get Existing Credential
        //=======================================================

        UserCredential? existingCredential =

            await _context
                .Set<UserCredential>()
                .FirstOrDefaultAsync
                (
                    x =>

                        x.UserCredentialId ==
                        userCredential.UserCredentialId
                );


        if
        (
            existingCredential ==
            null
        )
        {
            throw new InvalidOperationException(
                $"User credential '{userCredential.UserCredentialId}' was not found."
            );
        }


        //=======================================================
        // Update Password Authentication Fields
        //=======================================================

        existingCredential.PasswordHash =
            userCredential.PasswordHash;


        //=======================================================
        // Update Password Audit Fields
        //=======================================================

        existingCredential.PasswordChangedDate =
            userCredential.PasswordChangedDate;


        existingCredential.ModifiedDate =
            userCredential.ModifiedDate;


        //=======================================================
        // Save Changes
        //=======================================================

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Ensure User Credential
    //===========================================================

    public async Task<UserCredential>
        EnsureUserCredentialAsync(
            long userProfileId)
    {
        UserCredential? credential =

            await _context
                .Set<UserCredential>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.UserProfileId ==
                        userProfileId
                );


        if
        (
            credential !=
            null
        )
        {
            return credential;
        }


        credential =
            new UserCredential
            {
                UserProfileId =
                    userProfileId,

                PasswordHash =
                    string.Empty,

                PasswordChangedDate =
                    null,

                CreatedDate =
                    DateTime.UtcNow,

                ModifiedDate =
                    null
            };


        _context
            .Set<UserCredential>()
            .Add(
                credential
            );


        await _context.SaveChangesAsync();


        return credential;
    }


    //===========================================================
    // Invalidate Password Reset Verifications
    //===========================================================

    public async Task
        InvalidatePasswordResetVerificationsAsync(
            long userProfileId)
    {
        List<PasswordResetVerification>
            verifications =

                await _context
                    .Set<PasswordResetVerification>()
                    .Where
                    (
                        x =>

                            x.UserProfileId ==
                            userProfileId

                            &&

                            x.UsedAt ==
                            null
                    )
                    .ToListAsync();


        if
        (
            verifications.Count ==
            0
        )
        {
            return;
        }


        DateTime now =
            DateTime.UtcNow;


        foreach
        (
            PasswordResetVerification verification
                in verifications
        )
        {
            verification.UsedAt =
                now;
        }


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Create Password Reset Verification
    //===========================================================

    public async Task<PasswordResetVerification>
        CreatePasswordResetVerificationAsync(
            PasswordResetVerification verification)
    {
        if
        (
            verification ==
            null
        )
        {
            throw new ArgumentNullException(
                nameof(verification)
            );
        }


        //=======================================================
        // Ensure UTC DateTime Values
        //=======================================================

        verification.ExpiresAt =
            verification.ExpiresAt.ToUniversalTime();


        verification.CreatedDate =
            verification.CreatedDate == default
            ? DateTime.UtcNow
            : verification.CreatedDate.ToUniversalTime();


        _context
            .Set<PasswordResetVerification>()
            .Add(
                verification
            );


        await _context.SaveChangesAsync();


        return verification;
    }


    //===========================================================
    // Get Active Password Reset Verification
    //===========================================================

    public async Task<PasswordResetVerification?>
        GetActivePasswordResetVerificationAsync(
            long userProfileId)
    {
        DateTime now =
            DateTime.UtcNow;


        return await _context
            .Set<PasswordResetVerification>()
            .FirstOrDefaultAsync
            (
                x =>

                    x.UserProfileId ==
                    userProfileId

                    &&

                    x.UsedAt ==
                    null

                    &&

                    x.ExpiresAt >
                    now
            );
    }


    //===========================================================
    // Increment Password Reset Attempt
    //===========================================================

    public async Task
        IncrementPasswordResetAttemptAsync(
            PasswordResetVerification verification)
    {
        if
        (
            verification ==
            null
        )
        {
            throw new ArgumentNullException(
                nameof(verification)
            );
        }


        //=======================================================
        // Increment Attempt Count Exactly Once
        //=======================================================

        verification.AttemptCount++;


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Mark Password Reset Verification Used
    //===========================================================

    public async Task
        MarkPasswordResetVerificationUsedAsync(
            PasswordResetVerification verification)
    {
        if
        (
            verification ==
            null
        )
        {
            throw new ArgumentNullException(
                nameof(verification)
            );
        }


        verification.UsedAt =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Get Next Profile Code
    //===========================================================

    private async Task<string>
        GetNextProfileCodeAsync()
    {
        List<string> existingCodes =

            await _context
                .Set<UserProfile>()

                .AsNoTracking()

                .Where
                (
                    x =>
                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        x.ProfileCode
                )

                .ToListAsync();


        int nextSequenceNo =
            1;


        while
        (
            existingCodes.Any
            (
                x =>
                    string.Equals
                    (
                        x,

                        CodeGenerator.GenerateUserProfileCode(
                            nextSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextSequenceNo++;
        }


        return CodeGenerator.GenerateUserProfileCode(
            nextSequenceNo);
    }
}