//===============================================================
// Namespaces
//===============================================================
using AppCore.Domain.Common;
using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.Interfaces;

using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Activity;

//===============================================================
// Navigation Activity Repository
//===============================================================

public class NavigationActivityRepository
    : INavigationActivityRepository
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly AppDbContext _context;

    //===============================================================
    // Constructor
    //===============================================================

    public NavigationActivityRepository(
        AppDbContext context)
    {
        _context = context;
    }

    //===============================================================
    // Get All
    //===============================================================

    public async Task<List<NavigationActivityDto>> GetAllAsync(
        long? moduleId = null)
    {
        IQueryable<NavigationActivity> query =
            _context.NavigationActivities

                .AsNoTracking()

                .Include(x => x.NavigationModule)

                .Where(x => !x.IsDeleted);

        if (moduleId.HasValue)
        {
            query =
                query.Where(x =>
                    x.NavigationModuleId == moduleId.Value);
        }

        return await query

            .OrderBy(x => x.NavigationModule.DisplayOrder)

            .ThenBy(x => x.DisplayOrder)

            .ThenBy(x => x.Name)

            .Select(x => new NavigationActivityDto
            {
                Id =
                    x.Id,

                NavigationModuleId =
                    x.NavigationModuleId,

                NavigationModuleName =
                    x.NavigationModule.Name,

                Code =
                    x.Code,

                Name =
                    x.Name,

                DisplayOrder =
                    x.DisplayOrder,

                Remarks =
                    x.Remarks,

                IsActive =
                    x.IsActive
            })

            .ToListAsync();
    }

    //===============================================================
    // Get By Id
    //===============================================================

    public async Task<NavigationActivityDto?> GetByIdAsync(
        long id)
    {
        return await _context.NavigationActivities

            .AsNoTracking()

            .Include(x => x.NavigationModule)

            .Where(x =>
                x.Id == id &&
                !x.IsDeleted)

            .Select(x => new NavigationActivityDto
            {
                Id =
                    x.Id,

                NavigationModuleId =
                    x.NavigationModuleId,

                NavigationModuleName =
                    x.NavigationModule.Name,

                Code =
                    x.Code,

                Name =
                    x.Name,

                DisplayOrder =
                    x.DisplayOrder,

                Remarks =
                    x.Remarks,

                IsActive =
                    x.IsActive
            })

            .FirstOrDefaultAsync();
    }

    //===============================================================
    // Create
    //===============================================================

    public async Task<long> CreateAsync(
        CreateNavigationActivityDto dto,
        long userId)
    {
        NavigationModule? module =
            await _context.NavigationModules

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.NavigationModuleId &&
                    !x.IsDeleted);

        if (module == null)
        {
            throw new KeyNotFoundException(
                "Navigation Module not found.");
        }

        int nextSequenceNo =
            await GetNextSequenceNoAsync(
                dto.NavigationModuleId);

        int nextCodeSequence =
            await GetNextCodeSequenceAsync();

        NavigationActivity entity =
            new()
            {
                NavigationModuleId =
                    dto.NavigationModuleId,

                SequenceNo =
                    nextSequenceNo,

                Code =
                    CodeGenerator.GenerateSpecialActivityCode(
                        nextCodeSequence),

                Name =
                    dto.Name,

                DisplayOrder =
                    dto.DisplayOrder,

                Remarks =
                    dto.Remarks,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context.NavigationActivities.Add(
            entity);

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Navigation Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Navigation Activity Created",

                ActivityDescription =
                    $"Navigation Activity '{entity.Name}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return entity.Id;
    }

    //===============================================================
    // Update
    //===============================================================

    public async Task UpdateAsync(
        UpdateNavigationActivityDto dto,
        long userId)
    {
        NavigationActivity? entity =
            await _context.NavigationActivities

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Navigation Activity not found.");
        }

        entity.NavigationModuleId =
            dto.NavigationModuleId;

        entity.Name =
            dto.Name;

        entity.DisplayOrder =
            dto.DisplayOrder;

        entity.Remarks =
            dto.Remarks;

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Navigation Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Navigation Activity Updated",

                ActivityDescription =
                    $"Navigation Activity '{entity.Name}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();
    }

    //===============================================================
    // Delete
    //===============================================================

    public async Task DeleteAsync(
        long id,
        long userId)
    {
        NavigationActivity? entity =
            await _context.NavigationActivities

                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Navigation Activity not found.");
        }

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Navigation Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Navigation Activity Deleted",

                ActivityDescription =
                    $"Navigation Activity '{entity.Name}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();
    }

    //===============================================================
    // Restore
    //===============================================================

    public async Task<bool> RestoreAsync(
        long userId)
    {
        NavigationActivity? entity =
            await _context.NavigationActivities

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

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Navigation Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Navigation Activity Restored",

                ActivityDescription =
                    $"Navigation Activity '{entity.Name}' restored.",

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

    //===============================================================
    // Get Defaults
    //===============================================================

    public async Task<NavigationActivityDefaultsDto> GetDefaultsAsync(
        long? navigationModuleId = null)
    {
        NavigationActivityDefaultsDto defaults =
            new();

        if (navigationModuleId.HasValue)
        {
            NavigationModule? module =
                await _context.NavigationModules

                    .AsNoTracking()

                    .FirstOrDefaultAsync(x =>
                        x.Id == navigationModuleId.Value &&
                        !x.IsDeleted);

            if (module != null)
            {
                int nextSequenceNo =
                    await GetNextSequenceNoAsync(
                        module.Id);

                int nextCodeSequence =
                    await GetNextCodeSequenceAsync();

                List<int> usedDisplayOrders =
                    await _context.NavigationActivities

                        .AsNoTracking()

                        .Where(x =>
                            x.NavigationModuleId == module.Id &&
                            !x.IsDeleted)

                        .Select(x =>
                            x.DisplayOrder)

                        .OrderBy(x =>
                            x)

                        .ToListAsync();

                int suggestedDisplayOrder = 1;

                foreach (int displayOrder in usedDisplayOrders)
                {
                    if (displayOrder == suggestedDisplayOrder)
                    {
                        suggestedDisplayOrder++;

                        continue;
                    }

                    if (displayOrder > suggestedDisplayOrder)
                    {
                        break;
                    }
                }

                defaults.NavigationModuleId =
                    module.Id;

                defaults.NavigationModuleName =
                    module.Name;

                defaults.Code =
                    CodeGenerator.GenerateSpecialActivityCode(
                        nextCodeSequence);

                defaults.DisplayOrder =
                    suggestedDisplayOrder;
            }
        }

        defaults.IsActive =
            true;

        return defaults;
    }

    //===============================================================
    // Exists
    //===============================================================

    public async Task<bool> ExistsAsync(
        long id)
    {
        return await _context.NavigationActivities

            .AnyAsync(x =>
                x.Id == id &&
                !x.IsDeleted);
    }

    //===============================================================
    // Get Next Sequence Number
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync(
        long navigationModuleId)
    {
        int? lastSequenceNo =
            await _context.NavigationActivities

                .Where(x =>
                    x.NavigationModuleId == navigationModuleId &&
                    !x.IsDeleted)

                .MaxAsync(x =>
                    (int?)x.SequenceNo);

        return (lastSequenceNo ?? 0) + 1;
    }


    //===============================================================
    // Get Next Code Sequence Number
    //===============================================================

    private async Task<int> GetNextCodeSequenceAsync()
    {
        List<string> activityCodes =
            await _context.NavigationActivities

                .AsNoTracking()

                .Where(x =>
                    !x.IsDeleted)

                .Select(x =>
                    x.Code)

                .ToListAsync();

        int maxCodeSequenceNo = 0;

        foreach (string code in activityCodes)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                continue;
            }

            string[] parts =
                code.Split('-');

            if (parts.Length != 2)
            {
                continue;
            }

            if (int.TryParse(parts[1], out int codeSequenceNo))
            {
                if (codeSequenceNo > maxCodeSequenceNo)
                {
                    maxCodeSequenceNo =
                        codeSequenceNo;
                }
            }
        }

        return maxCodeSequenceNo + 1;
    }
    
}