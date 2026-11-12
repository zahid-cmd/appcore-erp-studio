//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.Authentication.DTOs;

using AppCore.Application.Platform.Authentication.Interfaces;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;

using AppCore.Domain.Entities.Settings.GeneralSettings;

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
        if
        (
            userProfileId <=
            0
        )
        {
            return null;
        }


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
    // Get Active Branch Assignments By User Profile ID
    //===========================================================

    public async Task<List<LoginBranchDto>>
        GetActiveBranchAssignmentsByUserProfileIdAsync(
            long userProfileId)
    {
        if
        (
            userProfileId <=
            0
        )
        {
            return new List<LoginBranchDto>();
        }


        return await
            (
                from assignment
                    in _context
                        .Set<BranchAssignment>()

                join detail
                    in _context
                        .Set<BranchAssignmentDetail>()
                    on assignment.BranchAssignmentId
                    equals detail.BranchAssignmentId

                join branch
                    in _context
                        .Set<Branches>()
                    on detail.BranchId
                    equals branch.BranchId

                where
                    assignment.UserProfileId ==
                    userProfileId

                    &&

                    assignment.IsActive

                    &&

                    !assignment.IsDeleted

                    &&

                    detail.IsActive

                    &&

                    !detail.IsDeleted

                    &&

                    branch.IsActive

                    &&

                    !branch.IsDeleted

                orderby
                    branch.BranchName

                select new LoginBranchDto
                {
                    BranchId =
                        branch.BranchId,

                    BranchCode =
                        branch.BranchCode
                        ??
                        string.Empty,

                    BranchName =
                        branch.BranchName
                        ??
                        string.Empty
                }
            )
            .AsNoTracking()
            .ToListAsync();
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
        // Validate Credential ID
        //=======================================================

        if
        (
            userCredential.UserCredentialId <=
            0
        )
        {
            throw new InvalidOperationException(
                "A valid user credential ID is required."
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


    //===========================================================
    // Switch Branch (user menu, 2026-11-07)
    //===========================================================

    // Setting : Security & Permission › Branch Assignment
    private const string BranchSwitchSetting = "CFG-MOD-006-0101";

    private const string HistoryModule = "Security & Permission";

    private const string HistoryEntity = "BranchSwitch";


    public async Task<UserProfile?>
        GetUserProfileByIdAsync(
            long userProfileId)
    {
        if (userProfileId <= 0)
        {
            return null;
        }

        return await _context
            .Set<UserProfile>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserProfileId == userProfileId);
    }


    public async Task<Dictionary<long, (string WingCode, string WingName, List<string> Lines)>>
        GetBranchSwitchDetailsAsync(
            IEnumerable<long> branchIds)
    {
        List<long> ids =
            branchIds.Distinct().ToList();

        var rows =
            await
                (
                    from branch in _context.Set<Branches>().AsNoTracking()
                    join wing in _context.Set<Wings>().AsNoTracking()
                        on branch.WingId equals wing.WingId into wings
                    from wing in wings.DefaultIfEmpty()
                    where ids.Contains(branch.BranchId)
                    select new
                    {
                        branch.BranchId,
                        WingCode = wing == null ? string.Empty : wing.WingCode,
                        WingName = wing == null ? string.Empty : wing.WingName
                    }
                )
                .ToListAsync();

        Dictionary<long, HashSet<string>> lines =
            await AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess
                .ActiveLinesByBranchAsync(
                    _context,
                    AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess.Today());

        return rows.ToDictionary(
            x => x.BranchId,
            x =>
            (
                x.WingCode ?? string.Empty,
                x.WingName ?? string.Empty,
                lines.TryGetValue(x.BranchId, out HashSet<string>? set)
                    ? AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess.Lines
                        .Where(set.Contains)
                        .ToList()
                    : new List<string>()
            ));
    }


    public async Task<bool>
        IsBranchSwitchAllowedAsync()
    {
        SystemConfigurations? row =
            await _context
                .Set<SystemConfigurations>()
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.ConfigurationCode == BranchSwitchSetting
                        && !x.IsDeleted);

        return row?.IsEnabled ?? true;
    }


    public async Task
        AddBranchSwitchHistoryAsync(
            long userProfileId,
            string userName,
            LoginBranchDto? fromBranch,
            LoginBranchDto toBranch)
    {
        string from =
            fromBranch == null
                ? "(unknown branch)"
                : fromBranch.BranchName;

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = userProfileId,
                ActivityType = "Switch",
                ActivityTitle = "Branch Switched",
                ActivityDescription = $"{from} to {toBranch.BranchName} ({toBranch.BranchCode}).",
                PerformedBy = userProfileId,
                PerformedByName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                PerformedDate = DateTime.UtcNow
            });

        await _context.SaveChangesAsync();
    }
}
