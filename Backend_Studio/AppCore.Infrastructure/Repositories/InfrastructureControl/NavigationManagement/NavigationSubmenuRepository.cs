//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Domain.Common;

using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.Interfaces;

using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Submenu;

//===============================================================
// Navigation Submenu Repository
//===============================================================

public class NavigationSubmenuRepository : INavigationSubmenuRepository
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly AppDbContext _context;


    //===============================================================
    // Constructor
    //===============================================================

    public NavigationSubmenuRepository(
        AppDbContext context)
    {
        _context = context;
    }

    //===============================================================
    // Navigation Submenu Query
    //===============================================================

    private IQueryable<NavigationSubmenuDto> NavigationSubmenuQuery()
    {
        return _context.NavigationSubmenus

            .AsNoTracking()

            .Include(x => x.Menu)
                .ThenInclude(x => x.NavigationModule)

            .Where(x =>
                !x.IsDeleted)

            .Select(x => new NavigationSubmenuDto
            {
                Id =
                    x.Id,

                NavigationModuleId =
                    x.Menu.NavigationModuleId,

                NavigationModuleCode =
                    x.Menu.NavigationModule.Code,

                NavigationModuleName =
                    x.Menu.NavigationModule.Name,

                NavigationMenuId =
                    x.NavigationMenuId,

                NavigationMenuCode =
                    x.Menu.Code,

                NavigationMenuName =
                    x.Menu.Name,

                Code =
                    x.Code,

                Name =
                    x.Name,

                Icon =
                    x.Icon,

                RouteKey =
                    x.RouteKey,

                Route =
                    x.Route,

                DisplayOrder =
                    x.DisplayOrder,

                Remarks =
                    x.Remarks,

                IsActive =
                    x.IsActive
            });
    }

    //===============================================================
    // Get All
    //===============================================================

    public async Task<List<NavigationSubmenuDto>> GetAllAsync()
    {
        return await NavigationSubmenuQuery()

            .OrderBy(x =>
                x.NavigationModuleName)

            .ThenBy(x =>
                x.NavigationMenuName)

            .ThenBy(x =>
                x.DisplayOrder)

            .ThenBy(x =>
                x.Name)

            .ToListAsync();
    }

    //===============================================================
    // Get By Menu
    //===============================================================

    public async Task<List<NavigationSubmenuDto>> GetByMenuAsync(
        long navigationMenuId)
    {
        return await NavigationSubmenuQuery()

            .Where(x =>
                x.NavigationMenuId == navigationMenuId)

            .OrderBy(x =>
                x.DisplayOrder)

            .ThenBy(x =>
                x.Name)

            .ToListAsync();
    }

    //===============================================================
    // Get By Id
    //===============================================================

    public async Task<NavigationSubmenuDto?> GetByIdAsync(
        long id)
    {
        return await NavigationSubmenuQuery()

            .FirstOrDefaultAsync(x =>
                x.Id == id);
    }

    //===============================================================
    // Get Next Code
    //===============================================================

    public async Task<string> GetNextCodeAsync(
        long navigationMenuId)
    {
        NavigationMenu? menu =
            await _context.NavigationMenus

                .Include(x =>
                    x.NavigationModule)

                .FirstOrDefaultAsync(x =>
                    x.Id == navigationMenuId &&
                    !x.IsDeleted);


        if (menu == null)
        {
            throw new KeyNotFoundException(
                "Navigation Menu not found.");
        }


        int nextSequenceNo =
            await GetNextSequenceNoAsync(
                navigationMenuId);


        return CodeGenerator.GenerateSubmenuCode(
            menu.NavigationModule.SequenceNo,
            menu.SequenceNo,
            nextSequenceNo);
    }



    //===============================================================
    // Get Defaults
    //===============================================================

    public async Task<NavigationSubmenuDefaultsDto> GetDefaultsAsync(
        long navigationMenuId)
    {
        return new NavigationSubmenuDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    navigationMenuId),


            DisplayOrder =
                await GetSuggestedDisplayOrderAsync(
                    navigationMenuId)
        };
    }



    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    public async Task<int> GetSuggestedDisplayOrderAsync(
        long navigationMenuId)
    {
        List<int> usedDisplayOrders =
            await _context.NavigationSubmenus

                .AsNoTracking()

                .Where(x =>
                    x.NavigationMenuId == navigationMenuId
                    &&
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
    // Create
    //===============================================================

    public async Task<long> CreateAsync(
        CreateNavigationSubmenuDto dto,
        long userId)
    {
        NavigationMenu? menu =
            await _context.NavigationMenus

                .Include(x =>
                    x.NavigationModule)

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.NavigationMenuId
                    &&
                    !x.IsDeleted);


        if (menu == null)
        {
            throw new KeyNotFoundException(
                "Navigation Menu not found.");
        }


        int nextSequenceNo =
            await GetNextSequenceNoAsync(
                dto.NavigationMenuId);


        NavigationSubmenu entity =
            new NavigationSubmenu
            {
                NavigationMenuId =
                    dto.NavigationMenuId,


                SequenceNo =
                    nextSequenceNo,


                Code =
                    CodeGenerator.GenerateSubmenuCode(
                        menu.NavigationModule.SequenceNo,
                        menu.SequenceNo,
                        nextSequenceNo),


                Name =
                    dto.Name,


                Icon =
                    dto.Icon,


                RouteKey =
                    dto.RouteKey.Trim(),


                Route =
                    $"/{menu.NavigationModule.RouteKey}/{menu.RouteKey}/{dto.RouteKey.Trim()}",


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


        _context.NavigationSubmenus.Add(
            entity);


        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",


                EntityName =
                    "Navigation Submenu",


                EntityId =
                    entity.Id,


                ActivityType =
                    "Create",


                ActivityTitle =
                    "Navigation Submenu Created",


                ActivityDescription =
                    $"Submenu '{entity.Name}' created.",


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
        UpdateNavigationSubmenuDto dto,
        long userId)
    {
        NavigationSubmenu? entity =
            await _context.NavigationSubmenus

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id
                    &&
                    !x.IsDeleted);


        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Navigation Submenu not found.");
        }


        NavigationMenu? menu =
            await _context.NavigationMenus

                .Include(x =>
                    x.NavigationModule)

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.NavigationMenuId
                    &&
                    !x.IsDeleted);


        if (menu == null)
        {
            throw new KeyNotFoundException(
                "Navigation Menu not found.");
        }


        entity.NavigationMenuId =
            dto.NavigationMenuId;


        entity.Name =
            dto.Name;


        entity.Icon =
            dto.Icon;


        entity.RouteKey =
            dto.RouteKey.Trim();


        entity.Route =
            $"/{menu.NavigationModule.RouteKey}/{menu.RouteKey}/{dto.RouteKey.Trim()}";


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
                    "Navigation Submenu",


                EntityId =
                    entity.Id,


                ActivityType =
                    "Update",


                ActivityTitle =
                    "Navigation Submenu Updated",


                ActivityDescription =
                    $"Submenu '{entity.Name}' updated.",


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
            await _context.NavigationSubmenus

                .FirstOrDefaultAsync(x =>
                    x.Id == id
                    &&
                    !x.IsDeleted);


        if (entity == null)
        {
            throw new Exception(
                "Navigation Submenu not found."
            );
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
                    "Navigation Submenu",


                EntityId =
                    entity.Id,


                ActivityType =
                    "Delete",


                ActivityTitle =
                    "Navigation Submenu Deleted",


                ActivityDescription =
                    $"Submenu '{entity.Name}' deleted.",


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
        var entity =
            await _context.NavigationSubmenus

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
                    "Navigation Submenu",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Navigation Submenu Restored",

                ActivityDescription =
                    $"Submenu '{entity.Name}' restored.",

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
        return await _context.NavigationSubmenus

            .AnyAsync(x =>
                x.Id == id
                &&
                !x.IsDeleted);
    }

    //===============================================================
    // Route Key Exists
    //===============================================================

    public async Task<bool> RouteKeyExistsAsync(
        long navigationMenuId,
        string routeKey,
        long? excludeId = null)
    {
        routeKey = routeKey.Trim();

        return await _context.NavigationSubmenus

            .AnyAsync(x =>
                x.NavigationMenuId == navigationMenuId
                &&
                x.RouteKey.ToLower() == routeKey.ToLower()
                &&
                !x.IsDeleted
                &&
                (!excludeId.HasValue || x.Id != excludeId.Value));
    }

    //===============================================================
    // Get Next Sequence Number
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync(
        long navigationMenuId)
    {
        int? lastSequenceNo =
            await _context.NavigationSubmenus

                .Where(x =>
                    x.NavigationMenuId == navigationMenuId
                    &&
                    !x.IsDeleted)

                .MaxAsync(x =>
                    (int?)x.SequenceNo);


        return
            (lastSequenceNo ?? 0) + 1;
    }
}