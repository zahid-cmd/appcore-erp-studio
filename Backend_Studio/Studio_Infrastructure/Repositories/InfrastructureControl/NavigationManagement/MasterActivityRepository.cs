//===============================================================
// Namespaces
//===============================================================
using AppCore.Domain.Common;
using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

//===============================================================
// Entity Alias
//===============================================================

using MasterActivityEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.MasterActivity;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.MasterActivity;

//===============================================================
// Master Activity Repository
//===============================================================

public class MasterActivityRepository
    : IMasterActivityRepository
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly AppDbContext _context;

    //===============================================================
    // Constructor
    //===============================================================

    public MasterActivityRepository(
        AppDbContext context)
    {
        _context = context;
    }

    //===============================================================
    // Get All
    //===============================================================

    public async Task<List<MasterActivityDto>> GetAllAsync()
    {
        return await _context.MasterActivities

            .AsNoTracking()

            .Where(x => !x.IsDeleted)

            .OrderBy(x => x.DisplayOrder)

            .ThenBy(x => x.Name)

            .Select(x => new MasterActivityDto
            {
                Id = x.Id,

                Code = x.Code,

                Name = x.Name,

                DisplayOrder = x.DisplayOrder,

                Remarks = x.Remarks,

                IsActive = x.IsActive
            })

            .ToListAsync();
    }

    //===============================================================
    // Get By Id
    //===============================================================

    public async Task<MasterActivityDto?> GetByIdAsync(
        long id)
    {
        return await _context.MasterActivities

            .AsNoTracking()

            .Where(x =>
                x.Id == id &&
                !x.IsDeleted)

            .Select(x => new MasterActivityDto
            {
                Id = x.Id,

                Code = x.Code,

                Name = x.Name,

                DisplayOrder = x.DisplayOrder,

                Remarks = x.Remarks,

                IsActive = x.IsActive
            })

            .FirstOrDefaultAsync();
    }

    //===============================================================
    // Create
    //===============================================================

    public async Task<long> CreateAsync(
        CreateMasterActivityDto dto,
        long userId)
    {
        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        MasterActivityEntity entity =
            new()
            {
                SequenceNo =
                    nextSequenceNo,

                Code =
                    GetNextCode(
                        nextSequenceNo),

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

        _context.MasterActivities.Add(entity);

        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Master Activity Created",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' created.",

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
        UpdateMasterActivityDto dto,
        long userId)
    {
        MasterActivityEntity? entity =
            await _context.MasterActivities

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Master Activity not found.");
        }

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
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Master Activity Updated",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' updated.",

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
        MasterActivityEntity? entity =
            await _context.MasterActivities

                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Master Activity not found.");
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
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Master Activity Deleted",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' deleted.",

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
        MasterActivityEntity? entity =
            await _context.MasterActivities

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

        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Master Activity Restored",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' restored.",

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

    public async Task<MasterActivityDefaultsDto> GetDefaultsAsync()
    {
        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        MasterActivityDefaultsDto defaults =
            new()
            {
                Code =
                    GetNextCode(
                        nextSequenceNo),

                DisplayOrder =
                    await GetNextDisplayOrderAsync(),

                IsActive =
                    true
            };

        return defaults;
    }

    //===============================================================
    // Exists
    //===============================================================

    public async Task<bool> ExistsAsync(
        long id)
    {
        return await _context.MasterActivities

            .AnyAsync(x =>
                x.Id == id &&
                !x.IsDeleted);
    }

    //===============================================================
    // Get Next Code
    //===============================================================

    private string GetNextCode(
        int sequenceNo)
    {
        return CodeGenerator.GenerateMasterActivityCode(
            sequenceNo);
    }

    //===============================================================
    // Get Next Display Order
    //===============================================================

    private async Task<int> GetNextDisplayOrderAsync()
    {
        List<int> usedDisplayOrders =
            await _context.MasterActivities

                .AsNoTracking()

                .Where(x =>
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

        return suggestedDisplayOrder;
    }

    //===============================================================
    // Get Next Sequence Number
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync()
    {
        int? lastSequenceNo =
            await _context.MasterActivities

                .Where(x => !x.IsDeleted)

                .MaxAsync(x =>
                    (int?)x.SequenceNo);

        return (lastSequenceNo ?? 0) + 1;
    }
}