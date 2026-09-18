//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Application.SecurityPermission.UserManagement.UserProfile.DTOs;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;


//===============================================================
// User Profile Repository
//===============================================================

public class UserProfileRepository : IUserProfileRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IRoleAssignmentRepository
        _roleAssignmentRepository;

    private readonly ISpecialAssignmentRepository
        _specialAssignmentRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public UserProfileRepository(
        AppDbContext context,

        IRoleAssignmentRepository roleAssignmentRepository,

        ISpecialAssignmentRepository specialAssignmentRepository)
    {
        _context =
            context;

        _roleAssignmentRepository =
            roleAssignmentRepository;

        _specialAssignmentRepository =
            specialAssignmentRepository;
    }


    //===========================================================
    // User Profile Query
    //===========================================================

    private IQueryable<UserProfileDto> UserProfileQuery()
    {
        return _context
            .Set<UserProfileEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new UserProfileDto
                    {
                        UserProfileId =
                            x.UserProfileId,

                        ProfileCode =
                            x.ProfileCode,

                        UserName =
                            x.UserName,

                        DisplayName =
                            x.DisplayName,

                        FullName =
                            x.FullName,

                        Email =
                            x.Email,

                        MobileNo =
                            x.MobileNo,


                        //===================================================
                        // Role Assignment
                        //===================================================

                        HasRoleAssignment =
                            _context
                                .Set<RoleAssignment>()
                                .Any
                                (
                                    roleAssignment =>

                                        roleAssignment.UserProfileId ==
                                        x.UserProfileId

                                        &&

                                        !roleAssignment.IsDeleted
                                ),


                        RoleProfileCount =
                            (
                                from detail
                                in _context.Set<RoleAssignmentDetail>()

                                join roleAssignment
                                in _context.Set<RoleAssignment>()

                                on detail.RoleAssignmentId
                                equals roleAssignment.RoleAssignmentId

                                where

                                    roleAssignment.UserProfileId ==
                                    x.UserProfileId

                                    &&

                                    !roleAssignment.IsDeleted

                                    &&

                                    !detail.IsDeleted

                                select detail
                            )
                            .Count(),


                        PrimaryRoleName =
                            (
                                from detail
                                in _context.Set<RoleAssignmentDetail>()

                                join roleAssignment
                                in _context.Set<RoleAssignment>()

                                on detail.RoleAssignmentId
                                equals roleAssignment.RoleAssignmentId

                                join roleProfile
                                in _context.Set<RoleProfile>()

                                on detail.RoleProfileId
                                equals roleProfile.RoleProfileId

                                where

                                    roleAssignment.UserProfileId ==
                                    x.UserProfileId

                                    &&

                                    !roleAssignment.IsDeleted

                                    &&

                                    !detail.IsDeleted

                                    &&

                                    !roleProfile.IsDeleted

                                orderby
                                    detail.RoleAssignmentDetailId

                                select roleProfile.ProfileName
                            )
                            .FirstOrDefault()
                            ??
                            "Not Assigned",


                        //===================================================
                        // Status
                        //===================================================

                        IsActive =
                            x.IsActive,

                        IsDeleted =
                            x.IsDeleted,


                        //===================================================
                        // Soft Delete
                        //===================================================

                        DeletedBy =
                            x.DeletedBy,

                        DeletedDate =
                            x.DeletedDate,


                        //===================================================
                        // Audit
                        //===================================================

                        CreatedBy =
                            x.CreatedBy,

                        CreatedDate =
                            x.CreatedDate,

                        ModifiedBy =
                            x.ModifiedBy,

                        ModifiedDate =
                            x.ModifiedDate
                    }
            );
    }


//===========================================================
// Get All
//===========================================================

public async Task<List<UserProfileDto>>
    GetAllAsync()
{
    return await UserProfileQuery()

        .OrderBy
        (
            x =>
                x.ProfileCode
        )

        .ToListAsync();
}


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<UserProfileDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await UserProfileQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.UserProfileId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context
                .Set<UserProfileEntity>()

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
    // Get Defaults
    //===========================================================

    public async Task<UserProfileDefaultsDto>
        GetDefaultsAsync()
    {
        return new UserProfileDefaultsDto
        {
            Code =
                await GetNextCodeAsync()
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateUserProfileDto dto,

            long userId
        )
    {
        string profileCode =
            dto.ProfileCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(profileCode)
        )
        {
            profileCode =
                await GetNextCodeAsync();
        }


        UserProfileEntity entity =
            new UserProfileEntity
            {
                ProfileCode =
                    profileCode,

                UserName =
                    dto.UserName?.Trim()
                    ??
                    string.Empty,

                DisplayName =
                    dto.DisplayName?.Trim()
                    ??
                    string.Empty,

                FullName =
                    dto.FullName?.Trim()
                    ??
                    string.Empty,

                Email =
                    dto.Email?.Trim()
                    ??
                    string.Empty,

                MobileNo =
                    dto.MobileNo?.Trim()
                    ??
                    string.Empty,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context
            .Set<UserProfileEntity>()
            .Add(
                entity
            );


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "Security Permission",

                EntityName =
                    "User Profile",

                EntityId =
                    entity.UserProfileId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "User Profile Created",

                ActivityDescription =
                    $"User Profile '{entity.DisplayName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.UserProfileId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateUserProfileDto dto,

            long userId
        )
    {
        UserProfileEntity? entity =

            await _context
                .Set<UserProfileEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "User Profile not found."
            );
        }


        entity.ProfileCode =
            dto.ProfileCode?.Trim()
            ??
            string.Empty;


        entity.UserName =
            dto.UserName?.Trim()
            ??
            string.Empty;


        entity.DisplayName =
            dto.DisplayName?.Trim()
            ??
            string.Empty;


        entity.FullName =
            dto.FullName?.Trim()
            ??
            string.Empty;


        entity.Email =
            dto.Email?.Trim()
            ??
            string.Empty;


        entity.MobileNo =
            dto.MobileNo?.Trim()
            ??
            string.Empty;


        entity.IsActive =
            dto.IsActive;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "Security Permission",

                EntityName =
                    "User Profile",

                EntityId =
                    entity.UserProfileId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "User Profile Updated",

                ActivityDescription =
                    $"User Profile '{entity.DisplayName}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,

            long userId
        )
    {
        //===========================================================
        // Resolve User Profile
        //===========================================================

        UserProfileEntity? entity =

            await _context
                .Set<UserProfileEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.UserProfileId ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "User Profile not found."
            );
        }


        //===========================================================
        // Check Role Assignment
        //===========================================================

        bool roleAssignmentExists =

            await _roleAssignmentRepository
                .ExistsByUserProfileIdAsync(
                    id
                );


        //===========================================================
        // Check Special Assignment
        //===========================================================

        bool specialAssignmentExists =

            await _specialAssignmentRepository
                .ExistsByUserProfileIdAsync(
                    id
                );


        //===========================================================
        // Block Delete If Configured In Both
        //===========================================================

        if
        (
            roleAssignmentExists

            &&

            specialAssignmentExists
        )
        {
            throw new InvalidOperationException(
                "User Profile cannot be deleted because it is configured in both Role Assignment and Special Assignment."
            );
        }


        //===========================================================
        // Block Delete If Configured In Role Assignment
        //===========================================================

        if
        (
            roleAssignmentExists
        )
        {
            throw new InvalidOperationException(
                "User Profile cannot be deleted because it is already configured in Role Assignment."
            );
        }


        //===========================================================
        // Block Delete If Configured In Special Assignment
        //===========================================================

        if
        (
            specialAssignmentExists
        )
        {
            throw new InvalidOperationException(
                "User Profile cannot be deleted because it is already configured in Special Assignment."
            );
        }


        //===========================================================
        // Soft Delete User Profile
        //===========================================================

        entity.IsDeleted =
            true;


        entity.DeletedBy =
            userId;


        entity.DeletedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "Security Permission",

                EntityName =
                    "User Profile",

                EntityId =
                    entity.UserProfileId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "User Profile Deleted",

                ActivityDescription =
                    $"User Profile '{entity.DisplayName}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        UserProfileEntity? entity =

            await _context
                .Set<UserProfileEntity>()

                .Where
                (
                    x =>
                        x.IsDeleted
                )

                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )

                .FirstOrDefaultAsync();


        if
        (
            entity ==
            null
        )
        {
            return false;
        }


        entity.IsDeleted =
            false;


        entity.DeletedBy =
            null;


        entity.DeletedDate =
            null;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "Security Permission",

                EntityName =
                    "User Profile",

                EntityId =
                    entity.UserProfileId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "User Profile Restored",

                ActivityDescription =
                    $"User Profile '{entity.DisplayName}' restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return true;
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<UserProfileEntity>()

            .AnyAsync
            (
                x =>

                    x.UserProfileId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}