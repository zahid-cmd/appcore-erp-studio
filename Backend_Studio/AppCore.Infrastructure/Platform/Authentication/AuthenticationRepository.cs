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

        _context
            .Set<UserCredential>()
            .Update(
                userCredential
            );

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