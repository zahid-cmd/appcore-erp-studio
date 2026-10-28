//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Domain.Common;
using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.Interfaces;

using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Menu;

//===============================================================
// Navigation Menu Repository
//===============================================================

public class NavigationMenuRepository : INavigationMenuRepository
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly AppDbContext _context;

    //===============================================================
    // Constructor
    //===============================================================

    public NavigationMenuRepository(
        AppDbContext context)
    {
        _context = context;
    }


//===============================================================
// Navigation Menu Query
//===============================================================

private IQueryable<NavigationMenuDto> NavigationMenuQuery()
{
    return _context.NavigationMenus

        .AsNoTracking()

        .Include(x => x.NavigationModule)

        .Where(x =>
            !x.IsDeleted)

        .Select(x => new NavigationMenuDto
        {
            Id =
                x.Id,

            NavigationModuleId =
                x.NavigationModuleId,

            NavigationModuleCode =
                x.NavigationModule.Code,

            NavigationModuleName =
                x.NavigationModule.Name,

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

    public async Task<List<NavigationMenuDto>> GetAllAsync()
    {
        return await _context.NavigationMenus

            .AsNoTracking()

            .Include(x => x.NavigationModule)

            .Where(x =>
                !x.IsDeleted)

            .OrderBy(x =>
                x.NavigationModule.DisplayOrder)

            .ThenBy(x =>
                x.DisplayOrder)

            .ThenBy(x =>
                x.Name)

            .Select(x => new NavigationMenuDto
            {
                Id =
                    x.Id,

                NavigationModuleId =
                    x.NavigationModuleId,

                NavigationModuleCode =
                    x.NavigationModule.Code,

                NavigationModuleName =
                    x.NavigationModule.Name,

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
            })

            .ToListAsync();
    }


    //===============================================================
    // Get By Module
    //===============================================================

    public async Task<List<NavigationMenuDto>> GetByModuleAsync(
        long navigationModuleId)
    {
        return await _context.NavigationMenus

            .AsNoTracking()

            .Include(x => x.NavigationModule)

            .Where(x =>
                !x.IsDeleted &&
                x.NavigationModuleId == navigationModuleId)

            .OrderBy(x =>
                x.DisplayOrder)

            .ThenBy(x =>
                x.Name)

            .Select(x => new NavigationMenuDto
            {
                Id =
                    x.Id,

                NavigationModuleId =
                    x.NavigationModuleId,

                NavigationModuleCode =
                    x.NavigationModule.Code,

                NavigationModuleName =
                    x.NavigationModule.Name,

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
            })

            .ToListAsync();
    }


    //===============================================================
    // Get Next Code
    //===============================================================

    public async Task<string> GetNextCodeAsync(
        long navigationModuleId)
    {
        NavigationModule? module =
            await _context.NavigationModules

                .FirstOrDefaultAsync(x =>
                    x.Id == navigationModuleId &&
                    !x.IsDeleted);

        if (module == null)
        {
            throw new KeyNotFoundException(
                "Navigation Module not found.");
        }

        int nextSequenceNo =
            await GetNextSequenceNoAsync(
                navigationModuleId);

        return CodeGenerator.GenerateMenuCode(
            module.SequenceNo,
            nextSequenceNo);
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    public async Task<NavigationMenuDefaultsDto> GetDefaultsAsync(
        long navigationModuleId)
    {
        return new NavigationMenuDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    navigationModuleId),

            DisplayOrder =
                await GetSuggestedDisplayOrderAsync(
                    navigationModuleId)
        };
    }


    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    public async Task<int> GetSuggestedDisplayOrderAsync(
        long navigationModuleId)
    {
        int? lastDisplayOrder =
            await _context.NavigationMenus

                .AsNoTracking()

                .Where(x =>
                    x.NavigationModuleId == navigationModuleId
                    &&
                    !x.IsDeleted)

                .MaxAsync(x =>
                    (int?)x.DisplayOrder);

        return
            (lastDisplayOrder ?? 0) + 1;
    }


    //===============================================================
    // Get By Id
    //===============================================================

    public async Task<NavigationMenuDto?> GetByIdAsync(
        long id)
    {
        return await _context.NavigationMenus

            .AsNoTracking()

            .Include(x => x.NavigationModule)

            .Where(x =>
                x.Id == id
                &&
                !x.IsDeleted)

            .Select(x => new NavigationMenuDto
            {
                Id =
                    x.Id,

                NavigationModuleId =
                    x.NavigationModuleId,

                NavigationModuleCode =
                    x.NavigationModule.Code,

                NavigationModuleName =
                    x.NavigationModule.Name,

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
            })

            .FirstOrDefaultAsync();
    }


    //===============================================================
    // Create
    //===============================================================

    public async Task<long> CreateAsync(
        CreateNavigationMenuDto dto,
        long userId)
    {
        //===========================================================
        // Validate Route Key
        //===========================================================

        dto.RouteKey =
            dto.RouteKey
                .Trim()
                .ToLower();

        if (string.IsNullOrWhiteSpace(dto.RouteKey))
        {
            throw new Exception(
                "Route Key is required.");
        }

        bool routeKeyExists =
            await RouteKeyExistsAsync(
                dto.NavigationModuleId,
                dto.RouteKey);

        if (routeKeyExists)
        {
            throw new Exception(
                "This route key already exists in the selected navigation module.");
        }

        //===========================================================
        // Validate Navigation Module
        //===========================================================

        NavigationModule? module =
            await _context.NavigationModules

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.NavigationModuleId
                    &&
                    !x.IsDeleted);

        if (module == null)
        {
            throw new KeyNotFoundException(
                "Navigation Module not found.");
        }

        //===========================================================
        // Generate Route
        //===========================================================

        string route =
            $"/{module.RouteKey}/{dto.RouteKey}";

        //===========================================================
        // Generate Sequence Number
        //
        // SequenceNo is the permanent creation sequence.
        //
        // It is completely independent from:
        //
        //     DisplayOrder
        //     Database Id
        //
        // Changing DisplayOrder therefore has no effect on the
        // next generated Code.
        //===========================================================

        int nextSequenceNo =
            await GetNextSequenceNoAsync(
                dto.NavigationModuleId);

        //===========================================================
        // Create Entity
        //===========================================================

        var entity =
            new NavigationMenu
            {
                NavigationModuleId =
                    dto.NavigationModuleId,

                SequenceNo =
                    nextSequenceNo,

                Code =
                    CodeGenerator.GenerateMenuCode(
                        module.SequenceNo,
                        nextSequenceNo),

                Name =
                    dto.Name,

                Icon =
                    dto.Icon,

                RouteKey =
                    dto.RouteKey,

                Route =
                    route,

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

        _context.NavigationMenus.Add(entity);

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
                    "Navigation Menu",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Navigation Menu Created",

                ActivityDescription =
                    $"Menu '{entity.Name}' created.",

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
        UpdateNavigationMenuDto dto,
        long userId)
    {
        //===========================================================
        // Validate Route Key
        //===========================================================

        dto.RouteKey =
            dto.RouteKey
                .Trim()
                .ToLower();

        if (string.IsNullOrWhiteSpace(dto.RouteKey))
        {
            throw new Exception(
                "Route Key is required.");
        }

        //===========================================================
        // Get Entity
        //===========================================================

        NavigationMenu? entity =
            await _context.NavigationMenus

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id
                    &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Navigation Menu not found.");
        }

        //===========================================================
        // Validate Navigation Module
        //===========================================================

        NavigationModule? module =
            await _context.NavigationModules

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.NavigationModuleId
                    &&
                    !x.IsDeleted);

        if (module == null)
        {
            throw new KeyNotFoundException(
                "Navigation Module not found.");
        }

        //===========================================================
        // Validate Route Key
        //===========================================================

        bool routeKeyExists =
            await RouteKeyExistsAsync(
                dto.NavigationModuleId,
                dto.RouteKey,
                dto.Id);

        if (routeKeyExists)
        {
            throw new Exception(
                "This route key already exists in the selected navigation module.");
        }

        //===========================================================
        // Generate Route
        //===========================================================

        string route =
            $"/{module.RouteKey}/{dto.RouteKey}";

        //===========================================================
        // Moved to another module ?
        //
        // The menu code follows the new module : "MNU-" + the
        // module code's number + the next menu number in that
        // module (deleted menus counted, never reused). Each of
        // its submenus keeps its own number and gets
        // "SUB-<new menu numbers>-sss". Routes are rebuilt for the
        // submenus whenever the menu's route changes. Every table
        // that keeps the old codes / module follows too.
        //===========================================================

        bool moved =
            entity.NavigationModuleId !=
            dto.NavigationModuleId;

        string oldMenuCode =
            entity.Code;

        string newMenuCode =
            oldMenuCode;

        int newSequenceNo =
            entity.SequenceNo;

        if (moved)
        {
            newSequenceNo =
                await GetNextSequenceNoAsync(
                    module.Id);

            newMenuCode =
                $"MNU-{module.Code.Substring(4)}-{newSequenceNo:D3}";

            bool codeTaken =
                await _context.NavigationMenus
                    .AnyAsync(x =>
                        x.Code == newMenuCode
                        &&
                        x.Id != entity.Id);

            if (codeTaken)
            {
                throw new InvalidOperationException(
                    $"Code {newMenuCode} is already used by another menu. Fix that menu's code first.");
            }
        }


        // Submenus of this menu (deleted ones too : they keep codes)
        List<NavigationSubmenu> submenus =
            await _context.NavigationSubmenus
                .Where(x =>
                    x.NavigationMenuId == entity.Id)
                .ToListAsync();

        List<(NavigationSubmenu Submenu, string OldCode, string NewCode)> codeChanges =
            new();

        if (moved)
        {
            foreach
            (
                NavigationSubmenu submenu
                in submenus
            )
            {
                string newSubCode =
                    $"SUB-{newMenuCode.Substring(4)}-{submenu.SequenceNo:D3}";

                bool subTaken =
                    await _context.NavigationSubmenus
                        .AnyAsync(x =>
                            x.Code == newSubCode
                            &&
                            x.NavigationMenuId != entity.Id);

                if (subTaken)
                {
                    throw new InvalidOperationException(
                        $"Code {newSubCode} is already used by a submenu of another menu. Fix that submenu's code first.");
                }

                codeChanges.Add(
                    (submenu, submenu.Code, newSubCode));
            }
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        //===========================================================
        // Update Entity
        //===========================================================

        entity.NavigationModuleId =
            dto.NavigationModuleId;

        entity.SequenceNo =
            newSequenceNo;

        entity.Code =
            newMenuCode;

        entity.Name =
            dto.Name;

        entity.Icon =
            dto.Icon;

        entity.RouteKey =
            dto.RouteKey;

        entity.Route =
            route;

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


        // Submenus : new codes (when moved) and routes
        foreach
        (
            NavigationSubmenu submenu
            in submenus
        )
        {
            submenu.Route =
                $"/{module.RouteKey}/{dto.RouteKey}/{submenu.RouteKey}";
        }

        foreach
        (
            var change
            in codeChanges
        )
        {
            change.Submenu.Code =
                change.NewCode;
        }

        await _context.SaveChangesAsync();


        if (moved)
        {
            await NavigationMoveReferences.MenuMovedAsync(
                _context,
                entity.Id,
                oldMenuCode,
                newMenuCode,
                entity.Name,
                module.Id,
                module.Code,
                module.Name);

            foreach
            (
                var change
                in codeChanges
            )
            {
                await NavigationMoveReferences.SubmenuMovedAsync(
                    _context,
                    change.Submenu.Id,
                    change.OldCode,
                    change.NewCode,
                    module.Id,
                    module.Code,
                    module.Name,
                    entity.Id,
                    newMenuCode,
                    entity.Name);
            }
        }


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Navigation Menu",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    moved
                        ? "Navigation Menu Moved"
                        : "Navigation Menu Updated",

                ActivityDescription =
                    moved
                        ? $"Menu '{entity.Name}' moved to '{module.Name}' ({oldMenuCode} -> {newMenuCode}, {codeChanges.Count} submenu(s) recoded)."
                        : $"Menu '{entity.Name}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();


        await transaction.CommitAsync();
    }


    //===============================================================
    // Delete
    //===============================================================

    public async Task DeleteAsync(
        long id,
        long userId)
    {
        var entity =
            await _context.NavigationMenus

                .FirstOrDefaultAsync(x =>
                    x.Id == id
                    &&
                    !x.IsDeleted);


        if (entity == null)
        {
            throw new Exception(
                "Navigation Menu not found."
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
                    "Navigation Menu",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Navigation Menu Deleted",

                ActivityDescription =
                    $"Menu '{entity.Name}' deleted.",

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
            await _context.NavigationMenus

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
                    "Navigation Menu",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Navigation Menu Restored",

                ActivityDescription =
                    $"Menu '{entity.Name}' restored.",

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
        return await _context.NavigationMenus

            .AnyAsync(x =>
                x.Id == id
                &&
                !x.IsDeleted);
    }


    //===============================================================
    // Route Key Exists
    //===============================================================

    public async Task<bool> RouteKeyExistsAsync(
        long navigationModuleId,
        string routeKey,
        long? excludeId = null)
    {
        routeKey =
            routeKey
                .Trim()
                .ToLower();

        return await _context.NavigationMenus

            .AnyAsync(x =>
                x.NavigationModuleId == navigationModuleId
                &&
                x.RouteKey == routeKey
                &&
                !x.IsDeleted
                &&
                (!excludeId.HasValue ||
                x.Id != excludeId.Value));
    }


    //===============================================================
    // Get Next Sequence Number
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync(
        long navigationModuleId)
    {
        //===========================================================
        // SequenceNo is completely independent from DisplayOrder
        // and Database Id.
        //
        // Deleted records are included because SequenceNo is the
        // permanent creation sequence used for Code generation.
        //
        // Therefore:
        //
        //     DisplayOrder
        //          ↓
        //     UI ordering only
        //
        //     SequenceNo
        //          ↓
        //     Permanent creation sequence
        //
        //     Code
        //          ↓
        //     Permanent business code
        //
        //     Database Id
        //          ↓
        //     Database primary key only
        //===========================================================

        int? lastSequenceNo =
            await _context.NavigationMenus

                .Where(x =>
                    x.NavigationModuleId == navigationModuleId)

                .MaxAsync(x =>
                    (int?)x.SequenceNo);

        return
            (lastSequenceNo ?? 0) + 1;
    }
}