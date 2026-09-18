//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.SecurityPermission.RoleManagement;
using AppCore.Application.SecurityPermission.RoleManagement.RoleProfile.DTOs;

using RoleProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.RoleManagement.RoleProfile;

using ActivityAssignmentEntity =
    AppCore.Domain.Entities.SecurityPermission.RoleManagement.ActivityAssignment;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;


//===============================================================
// Role Profile Repository
//===============================================================

public class RoleProfileRepository : IRoleProfileRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public RoleProfileRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Role Profile Query
    //===========================================================

    private IQueryable<RoleProfileDto> RoleProfileQuery()
    {
        return _context.RoleProfiles

            .AsNoTracking()

            .Where(x =>
                !x.IsDeleted)

            .Select(x => new RoleProfileDto
            {
                RoleProfileId =
                    x.RoleProfileId,

                ProfileCode =
                    x.ProfileCode,

                ProfileName =
                    x.ProfileName,

                Remarks =
                    x.Remarks,

                DisplayOrder =
                    x.DisplayOrder,

                IsSystemRole =
                    x.IsSystemRole,

                IsDefaultRole =
                    x.IsDefaultRole,

                IsActive =
                    x.IsActive,

                IsDeleted =
                    x.IsDeleted,

                DeletedBy =
                    x.DeletedBy,

                DeletedDate =
                    x.DeletedDate,

                CreatedBy =
                    x.CreatedBy,

                CreatedDate =
                    x.CreatedDate,

                ModifiedBy =
                    x.ModifiedBy,

                ModifiedDate =
                    x.ModifiedDate
            });
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<RoleProfileDto>> GetAllAsync()
    {
        return await RoleProfileQuery()

            .OrderBy(x =>
                x.DisplayOrder)

            .ThenBy(x =>
                x.ProfileName)

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<RoleProfileDto?> GetByIdAsync(
        long id)
    {
        return await RoleProfileQuery()

            .FirstOrDefaultAsync(x =>
                x.RoleProfileId == id);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string> GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context.RoleProfiles

                .AsNoTracking()

                .Where(x =>
                    !x.IsDeleted)

                .Select(x =>
                    x.ProfileCode)

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

                        CodeGenerator.GenerateRoleProfileCode(
                            nextSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextSequenceNo++;
        }


        return CodeGenerator.GenerateRoleProfileCode(
            nextSequenceNo);
    }


    //===========================================================
    // Get Suggested Display Order
    //===========================================================

    public async Task<int> GetSuggestedDisplayOrderAsync()
    {
        List<int> usedDisplayOrders =
            await _context.RoleProfiles

                .AsNoTracking()

                .Where(x =>
                    !x.IsDeleted)

                .Select(x =>
                    x.DisplayOrder)

                .OrderBy(x =>
                    x)

                .ToListAsync();


        int suggestedDisplayOrder =
            1;


        foreach
        (
            int displayOrder
            in usedDisplayOrders
        )
        {
            if
            (
                displayOrder ==
                suggestedDisplayOrder
            )
            {
                suggestedDisplayOrder++;

                continue;
            }


            if
            (
                displayOrder >
                suggestedDisplayOrder
            )
            {
                break;
            }
        }


        return suggestedDisplayOrder;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<RoleProfileDefaultsDto> GetDefaultsAsync()
    {
        return new RoleProfileDefaultsDto
        {
            Code =
                await GetNextCodeAsync(),

            DisplayOrder =
                await GetSuggestedDisplayOrderAsync()
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync(
        CreateRoleProfileDto dto,
        long userId)
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


        RoleProfileEntity entity =
            new RoleProfileEntity
            {
                ProfileCode =
                    profileCode,

                ProfileName =
                    dto.ProfileName,

                Remarks =
                    dto.Remarks,

                DisplayOrder =
                    dto.DisplayOrder,

                IsSystemRole =
                    dto.IsSystemRole,

                IsDefaultRole =
                    dto.IsDefaultRole,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context.RoleProfiles.Add(
            entity);


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
                    "Role Profile",

                EntityId =
                    entity.RoleProfileId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Role Profile Created",

                ActivityDescription =
                    $"Role Profile '{entity.ProfileName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });


        await _context.SaveChangesAsync();


        return entity.RoleProfileId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task UpdateAsync(
        UpdateRoleProfileDto dto,
        long userId)
    {
        RoleProfileEntity? entity =
            await _context.RoleProfiles

                .FirstOrDefaultAsync(x =>
                    x.RoleProfileId ==
                    dto.RoleProfileId
                    &&
                    !x.IsDeleted);


        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Role Profile not found.");
        }


        entity.ProfileCode =
            dto.ProfileCode?.Trim()
            ??
            string.Empty;


        entity.ProfileName =
            dto.ProfileName;


        entity.Remarks =
            dto.Remarks;


        entity.DisplayOrder =
            dto.DisplayOrder;


        entity.IsSystemRole =
            dto.IsSystemRole;


        entity.IsDefaultRole =
            dto.IsDefaultRole;


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
                    "Role Profile",

                EntityId =
                    entity.RoleProfileId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Role Profile Updated",

                ActivityDescription =
                    $"Role Profile '{entity.ProfileName}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task DeleteAsync(
        long id,
        long userId)
    {
        //===========================================================
        // Resolve Role Profile
        //===========================================================

        RoleProfileEntity? entity =
            await _context.RoleProfiles

                .FirstOrDefaultAsync(x =>
                    x.RoleProfileId == id
                    &&
                    !x.IsDeleted);


        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Role Profile not found.");
        }


        //===========================================================
        // Activity Assignment Protection
        //
        // A Role Profile that has already been configured in
        // Activity Assignment must never be deleted.
        //
        // IMPORTANT:
        //
        // We intentionally DO NOT check IsDeleted here.
        //
        // The rule is:
        //
        // If Activity Assignment data exists against this
        // Role Profile, the Role Profile remains protected.
        //===========================================================

        bool activityAssignmentExists =
            await _context
                .Set<ActivityAssignmentEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.RoleProfileId ==
                        id
                );


        if
        (
            activityAssignmentExists
        )
        {
            throw new InvalidOperationException(
                $"Activity Assignment exists against Role Profile '{entity.ProfileName}'."
            );
        }


        //===========================================================
        // Soft Delete Role Profile
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
                    "Role Profile",

                EntityId =
                    entity.RoleProfileId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Role Profile Deleted",

                ActivityDescription =
                    $"Role Profile '{entity.ProfileName}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task<bool> RestoreAsync(
        long userId)
    {
        RoleProfileEntity? entity =
            await _context.RoleProfiles

                .Where(x =>
                    x.IsDeleted)

                .OrderByDescending(x =>
                    x.DeletedDate)

                .FirstOrDefaultAsync();


        if
        (
            entity == null
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
                    "Role Profile",

                EntityId =
                    entity.RoleProfileId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Role Profile Restored",

                ActivityDescription =
                    $"Role Profile '{entity.ProfileName}' restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });


        await _context.SaveChangesAsync();


        return true;
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool> ExistsAsync(
        long id)
    {
        return await _context.RoleProfiles

            .AnyAsync(x =>
                x.RoleProfileId == id
                &&
                !x.IsDeleted);
    }

}