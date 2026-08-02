//===============================================================
// Namespaces
//===============================================================
using AppCore.Domain.Common;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.NavigationManagement.Module.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Module.Interfaces;

using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Module;

//===============================================================
// Navigation Module Repository
//===============================================================

public class NavigationModuleRepository : INavigationModuleRepository
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly AppDbContext _context;

    //===============================================================
    // Constructor
    //===============================================================

    public NavigationModuleRepository(AppDbContext context)
    {
        _context = context;
    }

    //===============================================================
    // Get All
    //===============================================================

    public async Task<List<NavigationModuleDto>> GetAllAsync()
    {
        return await _context.NavigationModules

            .AsNoTracking()

            .Where(x =>
                !x.IsDeleted)

            .OrderBy(x =>
                x.DisplayOrder)

            .ThenBy(x =>
                x.Name)

            .Select(x => new NavigationModuleDto
            {
                Id =
                    x.Id,

                Code =
                    x.Code,

                Name =
                    x.Name,

                Icon =
                    x.Icon,

                RouteKey =
                    x.RouteKey,

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
    // Get Next Code
    //===============================================================

    public async Task<string> GetNextCodeAsync()
    {
        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        return CodeGenerator.GenerateModuleCode(
            nextSequenceNo);
    }

    //===============================================================
    // Get Defaults
    //===============================================================

    public async Task<NavigationModuleDefaultsDto> GetDefaultsAsync()
    {
        return new NavigationModuleDefaultsDto
        {
            Code =
                await GetNextCodeAsync(),

            DisplayOrder =
                await GetSuggestedDisplayOrderAsync()
        };
    }   
    
    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    public async Task<int> GetSuggestedDisplayOrderAsync()
    {
        List<int> usedDisplayOrders =
            await _context.NavigationModules

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
    // Get By Id
    //===============================================================

    public async Task<NavigationModuleDto?> GetByIdAsync(
        long id)
    {
        return await _context.NavigationModules

            .AsNoTracking()

            .Where(x =>
                x.Id == id
                &&
                !x.IsDeleted)

            .Select(x => new NavigationModuleDto
            {
                Id =
                    x.Id,

                Code =
                    x.Code,

                Name =
                    x.Name,

                Icon =
                    x.Icon,

                RouteKey =
                    x.RouteKey,

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
        CreateNavigationModuleDto dto,
        long userId)
    {
        //===========================================================
        // Validate Route Key
        //===========================================================

        dto.RouteKey =
            dto.RouteKey.Trim().ToLower();

        if (string.IsNullOrWhiteSpace(dto.RouteKey))
        {
            throw new Exception(
                "Route Key is required.");
        }

        if (await RouteKeyExistsAsync(dto.RouteKey))
        {
            throw new Exception(
                "Route Key already exists.");
        }

        //===========================================================
        // Generate Code
        //===========================================================

        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        //===========================================================
        // Create Entity
        //===========================================================

        var entity =
            new NavigationModule
            {
                SequenceNo =
                    nextSequenceNo,

                Code =
                    CodeGenerator.GenerateModuleCode(
                        nextSequenceNo),

                Name =
                    dto.Name,

                Icon =
                    dto.Icon,

                RouteKey =
                    dto.RouteKey,

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

        _context.NavigationModules.Add(entity);

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
                    "Navigation Module",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Navigation Module Created",

                ActivityDescription =
                    $"Module '{entity.Name}' created.",

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
        UpdateNavigationModuleDto dto,
        long userId)
    {
        //===========================================================
        // Validate Route Key
        //===========================================================

        dto.RouteKey =
            dto.RouteKey.Trim().ToLower();

        if (string.IsNullOrWhiteSpace(dto.RouteKey))
        {
            throw new Exception(
                "Route Key is required.");
        }

        if (await RouteKeyExistsAsync(
            dto.RouteKey,
            dto.Id))
        {
            throw new Exception(
                "Route Key already exists.");
        }

        //===========================================================
        // Get Entity
        //===========================================================

        var entity =
            await _context.NavigationModules

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id
                    &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Navigation Module not found.");
        }

        //===========================================================
        // Update Entity
        //===========================================================

        entity.Name =
            dto.Name;

        entity.Icon =
            dto.Icon;

        entity.RouteKey =
            dto.RouteKey;

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

        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Navigation Module",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Navigation Module Updated",

                ActivityDescription =
                    $"Module '{entity.Name}' updated.",

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
        var entity =
            await _context.NavigationModules

                .FirstOrDefaultAsync(x =>
                    x.Id == id
                    &&
                    !x.IsDeleted);



        if (entity == null)
        {
            throw new Exception(
                "Navigation Module not found."
            );
        }



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
                    "Navigation Management",


                EntityName =
                    "Navigation Module",


                EntityId =
                    entity.Id,



                ActivityType =
                    "Delete",


                ActivityTitle =
                    "Navigation Module Deleted",


                ActivityDescription =
                    $"Module '{entity.Name}' deleted.",



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

    //===============================================================
    // Restore
    //===============================================================

    public async Task<bool> RestoreAsync(
        long userId)
    {
        var entity =
            await _context.NavigationModules

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
                    "Navigation Module",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Navigation Module Restored",

                ActivityDescription =
                    $"Module '{entity.Name}' restored.",

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
    // Exists
    //===============================================================

    public async Task<bool> ExistsAsync(
        long id)
    {
        return await _context.NavigationModules

            .AnyAsync(x =>
                x.Id == id &&
                !x.IsDeleted);
    }

    //===============================================================
    // Module Name Exists
    //===============================================================

    public async Task<bool> ModuleNameExistsAsync(
        string name,
        long? excludeId = null)
    {
        name =
            name.Trim();

        return await _context.NavigationModules

            .AnyAsync(x =>

                !x.IsDeleted

                &&

                x.Name.ToUpper() ==
                name.ToUpper()

                &&

                (
                    !excludeId.HasValue
                    ||
                    x.Id != excludeId.Value
                ));
    }

    //===============================================================
    // Route Key Exists
    //===============================================================

    public async Task<bool> RouteKeyExistsAsync(
        string routeKey,
        long? excludeId = null)
    {
        routeKey =
            routeKey.Trim().ToLower();

        return await _context.NavigationModules

            .AnyAsync(x =>

                !x.IsDeleted

                &&

                x.RouteKey.ToLower() ==
                routeKey

                &&

                (
                    !excludeId.HasValue
                    ||
                    x.Id != excludeId.Value
                ));
    }

    //===============================================================
    // Display Order Exists
    //===============================================================

    public async Task<bool> DisplayOrderExistsAsync(
        int displayOrder,
        long? excludeId = null)
    {
        return await _context.NavigationModules

            .AnyAsync(x =>

                !x.IsDeleted

                &&

                x.DisplayOrder ==
                displayOrder

                &&

                (
                    !excludeId.HasValue
                    ||
                    x.Id != excludeId.Value
                ));
    }

    //===============================================================
    // Get Next Sequence Number
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync()
    {
        int? lastSequenceNo =
            await _context.NavigationModules

                .Where(x =>
                    !x.IsDeleted)

                .MaxAsync(x =>
                    (int?)x.SequenceNo);

        return
            (lastSequenceNo ?? 0) + 1;
    }


}