//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Domain.Common;
using AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.DTOs;
using AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.Interfaces;

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;

//===============================================================
// Repository
//===============================================================

public class RoleProfileRepository : IRoleProfileRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    //===========================================================
    // Constructor
    //===========================================================

    public RoleProfileRepository(AppDbContext context)
    {
        _context = context;
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<RoleProfileDefaultsDto> GetDefaultsAsync()
    {
        var nextSequence =
            await _context.RoleProfiles.CountAsync() + 1;

        return new RoleProfileDefaultsDto
        {
            ProfileCode =
                CodeGenerator.GenerateRoleProfileCode(nextSequence),

            DisplayOrder =
                nextSequence,

            IsSystemRole =
                false,

            IsDefaultRole =
                false,

            IsActive =
                true
        };
    }

    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<RoleProfileDto>> GetAllAsync()
    {
        return await _context.RoleProfiles

            .AsNoTracking()

            .Where(x =>
                !x.IsDeleted)

            .OrderBy(x =>
                x.DisplayOrder)

            .Select(x => new RoleProfileDto
            {
                RoleProfileId =
                    x.RoleProfileId,

                ProfileCode =
                    x.ProfileCode,

                ProfileName =
                    x.ProfileName,

                DisplayName =
                    x.DisplayName,

                ProfileTypeId =
                    x.ProfileTypeId,

                ProfileTypeName =
                    string.Empty,

                Remarks =
                    x.Remarks,

                DisplayOrder =
                    x.DisplayOrder,

                IsSystemRole =
                    x.IsSystemRole,

                IsDefaultRole =
                    x.IsDefaultRole,

                IsActive =
                    x.IsActive
            })

            .ToListAsync();
    }
    
    //===========================================================
    // Get Available For Activity Assignment
    //===========================================================

    public async Task<List<RoleProfileDto>>
        GetAvailableForActivityAssignmentAsync()
    {
        return await _context.RoleProfiles

            .AsNoTracking()

            .Where(roleProfile =>

                !roleProfile.IsDeleted

                &&

                !_context.ActivityAssignments.Any(
                    activityAssignment =>

                        !activityAssignment.IsDeleted

                        &&

                        activityAssignment.RoleProfileId ==
                        roleProfile.RoleProfileId
                )
            )

            .OrderBy(roleProfile =>
                roleProfile.DisplayOrder)

            .Select(roleProfile => new RoleProfileDto
            {
                RoleProfileId =
                    roleProfile.RoleProfileId,

                ProfileCode =
                    roleProfile.ProfileCode,

                ProfileName =
                    roleProfile.ProfileName,

                DisplayName =
                    roleProfile.DisplayName,

                ProfileTypeId =
                    roleProfile.ProfileTypeId,

                ProfileTypeName =
                    string.Empty,

                Remarks =
                    roleProfile.Remarks,

                DisplayOrder =
                    roleProfile.DisplayOrder,

                IsSystemRole =
                    roleProfile.IsSystemRole,

                IsDefaultRole =
                    roleProfile.IsDefaultRole,

                IsActive =
                    roleProfile.IsActive
            })

            .ToListAsync();
    }

    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<RoleProfileDto?> GetByIdAsync(
        long roleProfileId)
    {
        return await _context.RoleProfiles

            .AsNoTracking()

            .Where(x =>
                x.RoleProfileId == roleProfileId
                &&
                !x.IsDeleted)

            .Select(x => new RoleProfileDto
            {
                RoleProfileId =
                    x.RoleProfileId,

                ProfileCode =
                    x.ProfileCode,

                ProfileName =
                    x.ProfileName,

                DisplayName =
                    x.DisplayName,

                ProfileTypeId =
                    x.ProfileTypeId,

                ProfileTypeName =
                    string.Empty,

                Remarks =
                    x.Remarks,

                DisplayOrder =
                    x.DisplayOrder,

                IsSystemRole =
                    x.IsSystemRole,

                IsDefaultRole =
                    x.IsDefaultRole,

                IsActive =
                    x.IsActive
            })

            .FirstOrDefaultAsync();
    }

    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync(CreateRoleProfileDto dto)
    {
        var nextSequence =
            await _context.RoleProfiles.CountAsync() + 1;

        var entity =
            new RoleProfile
            {
                ProfileCode =
                    CodeGenerator.GenerateRoleProfileCode(nextSequence),

                ProfileName =
                    dto.ProfileName,

                DisplayName =
                    dto.DisplayName,

                ProfileTypeId =
                    dto.ProfileTypeId,

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

                CreatedDate =
                    DateTime.UtcNow,

                IsDeleted =
                    false
            };

        _context.RoleProfiles.Add(entity);

        await _context.SaveChangesAsync();

        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Security & Permission",

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
                    1,

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

    public async Task<bool> UpdateAsync(UpdateRoleProfileDto dto)
    {
        var entity =
            await _context.RoleProfiles

                .FirstOrDefaultAsync(x =>
                    x.RoleProfileId == dto.RoleProfileId
                    &&
                    !x.IsDeleted);

        if (entity == null)
        {
            return false;
        }

        entity.ProfileName =
            dto.ProfileName;

        entity.DisplayName =
            dto.DisplayName;

        entity.ProfileTypeId =
            dto.ProfileTypeId;

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

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Security & Permission",

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
                    1,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }

    //===========================================================
    // Delete
    //===========================================================

    public async Task<bool> DeleteAsync(long roleProfileId)
    {
        var entity =
            await _context.RoleProfiles

                .FirstOrDefaultAsync(x =>
                    x.RoleProfileId == roleProfileId
                    &&
                    !x.IsDeleted);

        if (entity == null)
        {
            return false;
        }

        entity.IsDeleted =
            true;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Security & Permission",

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
                    1,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }

    //===========================================================
    // Restore
    //===========================================================

    public async Task<bool> RestoreAsync()
    {
        var entity =
            await _context.RoleProfiles

                .Where(x =>
                    x.IsDeleted)

                .OrderByDescending(x =>
                    x.DeletedDate)

                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        entity.IsDeleted =
            false;

        entity.DeletedDate =
            null;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Security & Permission",

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
                    1,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }

    //===========================================================
    // Check Profile Name Exists
    //===========================================================

    public async Task<bool> ExistsByProfileNameAsync
    (
        string profileName,
        long? excludeRoleProfileId = null
    )
    {
        profileName =
            profileName.Trim();

        return await _context.RoleProfiles

            .AnyAsync(x =>

                !x.IsDeleted

                &&

                x.ProfileName.ToUpper() ==
                profileName.ToUpper()

                &&

                (
                    !excludeRoleProfileId.HasValue
                    ||
                    x.RoleProfileId != excludeRoleProfileId.Value
                ));
    }

    //===========================================================
    // Check Display Name Exists
    //===========================================================

    public async Task<bool> ExistsByDisplayNameAsync
    (
        string displayName,
        long? excludeRoleProfileId = null
    )
    {
        displayName =
            displayName.Trim();

        return await _context.RoleProfiles

            .AnyAsync(x =>

                !x.IsDeleted

                &&

                x.DisplayName.ToUpper() ==
                displayName.ToUpper()

                &&

                (
                    !excludeRoleProfileId.HasValue
                    ||
                    x.RoleProfileId != excludeRoleProfileId.Value
                ));
    }

    //===========================================================
    // Get Next Sequence Number
    //===========================================================

    private async Task<int> GetNextSequenceNoAsync()
    {
        int? lastSequenceNo =
            await _context.RoleProfiles

                .Where(x =>
                    !x.IsDeleted)

                .MaxAsync(x =>
                    (int?)x.DisplayOrder);

        return
            (lastSequenceNo ?? 0) + 1;
    }

}