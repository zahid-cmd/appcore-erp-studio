//===============================================================
// Imports
//===============================================================

using AppCore.Domain.Common;
using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;
using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.Interfaces;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.ProjectSynchronization;


//===============================================================
// Project Synchronization Repository
//===============================================================

public class ProjectSynchronizationRepository
    : IProjectSynchronizationRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ProjectSynchronizationRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===============================================================
    // Project Synchronization Query
    //===============================================================

    private IQueryable<ProjectSynchronizationDto>
        ProjectSynchronizationQuery()
    {
        return

            from synchronization in _context.ProjectSynchronizations

            where !synchronization.IsDeleted

            join module in _context.NavigationModules
                on synchronization.ModuleId equals module.Id
                into moduleJoin

            from module in moduleJoin.DefaultIfEmpty()

            join menu in _context.NavigationMenus
                on synchronization.MenuId equals menu.Id
                into menuJoin

            from menu in menuJoin.DefaultIfEmpty()

            join submenu in _context.NavigationSubmenus
                on synchronization.SubmenuId equals submenu.Id
                into submenuJoin

            from submenu in submenuJoin.DefaultIfEmpty()

            select new ProjectSynchronizationDto
            {
                Id =
                    synchronization.Id,

                SynchronizationLevel =
                    synchronization.SynchronizationLevel,


                ModuleId =
                    synchronization.ModuleId,

                ModuleCode =
                    module != null
                        ? module.Code
                        : string.Empty,

                ModuleName =
                    module != null
                        ? module.Name
                        : string.Empty,


                MenuId =
                    synchronization.MenuId,

                MenuCode =
                    menu != null
                        ? menu.Code
                        : string.Empty,

                MenuName =
                    menu != null
                        ? menu.Name
                        : string.Empty,


                SubmenuId =
                    synchronization.SubmenuId,

                SubmenuCode =
                    submenu != null
                        ? submenu.Code
                        : string.Empty,

                SubmenuName =
                    submenu != null
                        ? submenu.Name
                        : string.Empty,


                SynchronizationTarget =
                    synchronization.SynchronizationTarget,


                //===================================================
                // Frontend Configuration
                //===================================================

                FrontendSolution =
                    synchronization.FrontendSolution,

                FrontendProject =
                    synchronization.FrontendProject,

                FrontendSourceFolder =
                    synchronization.FrontendSourceFolder,

                FrontendFeatureFolder =
                    synchronization.FrontendFeatureFolder,

                FrontendModuleFolder =
                    synchronization.FrontendModuleFolder,

                FrontendModelFolder =
                    synchronization.FrontendModelFolder,

                FrontendPagesFolder =
                    synchronization.FrontendPagesFolder,

                FrontendRoutesFolder =
                    synchronization.FrontendRoutesFolder,

                FrontendServicesFolder =
                    synchronization.FrontendServicesFolder,


                //===================================================
                // Frontend Application Registration
                //===================================================

                FrontendModuleRouteFile =
                    synchronization.FrontendModuleRouteFile,

                FrontendParentRouteFile =
                    synchronization.FrontendParentRouteFile,

                FrontendRoutePath =
                    synchronization.FrontendRoutePath,


                //===================================================
                // Backend Configuration
                //===================================================

                BackendApiProject =
                    synchronization.BackendApiProject,

                BackendApplicationProject =
                    synchronization.BackendApplicationProject,

                BackendDomainProject =
                    synchronization.BackendDomainProject,

                BackendInfrastructureProject =
                    synchronization.BackendInfrastructureProject,

                BackendControllerFolder =
                    synchronization.BackendControllerFolder,

                BackendDtoFolder =
                    synchronization.BackendDtoFolder,

                BackendInterfaceFolder =
                    synchronization.BackendInterfaceFolder,

                BackendEntityFolder =
                    synchronization.BackendEntityFolder,

                BackendRepositoryFolder =
                    synchronization.BackendRepositoryFolder,

                BackendConfigurationFolder =
                    synchronization.BackendConfigurationFolder,

                BackendDependencyInjectionFile =
                    synchronization.BackendDependencyInjectionFile,

                BackendDbContextFile =
                    synchronization.BackendDbContextFile,

                BackendProgramFile =
                    synchronization.BackendProgramFile,

                BackendMigrationFolder =
                    synchronization.BackendMigrationFolder,

                DatabaseProvider =
                    synchronization.DatabaseProvider,


                //===================================================
                // Status
                //===================================================

                FrontendStatus =
                    synchronization.FrontendStatus,

                BackendStatus =
                    synchronization.BackendStatus,

                Remarks =
                    synchronization.Remarks,


                //===================================================
                // Last Synchronization
                //===================================================

                LastSynchronizedBy =
                    synchronization.LastSynchronizedBy,

                LastSynchronizedDate =
                    synchronization.LastSynchronizedDate,


                //===================================================
                // Audit
                //===================================================

                CreatedBy =
                    synchronization.CreatedBy,

                CreatedDate =
                    synchronization.CreatedDate,

                ModifiedBy =
                    synchronization.ModifiedBy,

                ModifiedDate =
                    synchronization.ModifiedDate,

                DeletedBy =
                    synchronization.DeletedBy,

                DeletedDate =
                    synchronization.DeletedDate,

                IsDeleted =
                    synchronization.IsDeleted
            };
    }

    //===============================================================
    // Get All
    //===============================================================

    public async Task<List<ProjectSynchronizationDto>> GetAllAsync()
    {
        return await ProjectSynchronizationQuery()

            .OrderBy(x =>
                x.SynchronizationLevel)

            .ThenBy(x =>
                x.ModuleName)

            .ThenBy(x =>
                x.MenuName)

            .ThenBy(x =>
                x.SubmenuName)

            .ToListAsync();
    }


    //===============================================================
    // Get By Id
    //===============================================================

    public async Task<ProjectSynchronizationDto?> GetByIdAsync(
        long id)
    {
        return await ProjectSynchronizationQuery()

            .FirstOrDefaultAsync(x =>
                x.Id == id);
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    public async Task<ProjectSynchronizationDefaultsDto> GetDefaultsAsync()
    {
        await Task.CompletedTask;

        return new ProjectSynchronizationDefaultsDto
        {
            FrontendStatus =
                "Pending",

            BackendStatus =
                "Pending"
        };
    }

    //===============================================================
    // Create
    //===============================================================

    public async Task<long> CreateAsync(
        CreateProjectSynchronizationDto dto,
        long userId)
    {
        //===========================================================
        // Find Existing Synchronization
        //===========================================================

        var entity =
            await _context.ProjectSynchronizations

                .FirstOrDefaultAsync(x =>

                    !x.IsDeleted

                    &&

                    x.SynchronizationLevel ==
                        dto.SynchronizationLevel

                    &&

                    x.ModuleId ==
                        dto.ModuleId

                    &&

                    x.MenuId ==
                        dto.MenuId

                    &&

                    x.SubmenuId ==
                        dto.SubmenuId);


        //===========================================================
        // Existing Record
        //===========================================================

        if (entity != null)
        {
            //=======================================================
            // Synchronization
            //=======================================================

            entity.SynchronizationTarget =
                dto.SynchronizationTarget;


            //=======================================================
            // Status
            //=======================================================

            entity.FrontendStatus =
                dto.SynchronizationTarget == "Frontend"
                    ? "Pending"
                    : entity.FrontendStatus;

            entity.BackendStatus =
                dto.SynchronizationTarget == "Backend"
                    ? "Pending"
                    : entity.BackendStatus;


            //=======================================================
            // Frontend Configuration
            //=======================================================

            entity.FrontendSolution =
                dto.FrontendSolution;

            entity.FrontendProject =
                dto.FrontendProject;

            entity.FrontendSourceFolder =
                dto.FrontendSourceFolder;

            entity.FrontendFeatureFolder =
                dto.FrontendFeatureFolder;

            entity.FrontendModuleFolder =
                dto.FrontendModuleFolder;

            entity.FrontendModelFolder =
                dto.FrontendModelFolder;

            entity.FrontendPagesFolder =
                dto.FrontendPagesFolder;

            entity.FrontendRoutesFolder =
                dto.FrontendRoutesFolder;

            entity.FrontendServicesFolder =
                dto.FrontendServicesFolder;


            //=======================================================
            // Frontend Registration
            //=======================================================

            entity.FrontendModuleRouteFile =
                dto.FrontendModuleRouteFile;

            entity.FrontendParentRouteFile =
                dto.FrontendParentRouteFile;

            entity.FrontendRoutePath =
                dto.FrontendRoutePath;


            //=======================================================
            // Backend Configuration
            //=======================================================

            entity.BackendApiProject =
                dto.BackendApiProject;

            entity.BackendApplicationProject =
                dto.BackendApplicationProject;

            entity.BackendDomainProject =
                dto.BackendDomainProject;

            entity.BackendInfrastructureProject =
                dto.BackendInfrastructureProject;

            entity.BackendControllerFolder =
                dto.BackendControllerFolder;

            entity.BackendDtoFolder =
                dto.BackendDtoFolder;

            entity.BackendInterfaceFolder =
                dto.BackendInterfaceFolder;

            entity.BackendEntityFolder =
                dto.BackendEntityFolder;

            entity.BackendRepositoryFolder =
                dto.BackendRepositoryFolder;

            entity.BackendConfigurationFolder =
                dto.BackendConfigurationFolder;

            entity.BackendDependencyInjectionFile =
                dto.BackendDependencyInjectionFile;

            entity.BackendDbContextFile =
                dto.BackendDbContextFile;

            entity.BackendProgramFile =
                dto.BackendProgramFile;

            entity.BackendMigrationFolder =
                dto.BackendMigrationFolder;

            entity.DatabaseProvider =
                dto.DatabaseProvider;


            //=======================================================
            // Additional Information
            //=======================================================

            entity.Remarks =
                dto.Remarks;


            //=======================================================
            // Audit
            //=======================================================

            entity.ModifiedBy =
                userId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            await _context.SaveChangesAsync();

            return entity.Id;
        }


        //===========================================================
        // Create New Entity
        //===========================================================

        entity =
            new()
            {
                //===================================================
                // Navigation
                //===================================================

                SynchronizationLevel =
                    dto.SynchronizationLevel,

                ModuleId =
                    dto.ModuleId,

                MenuId =
                    dto.MenuId,

                SubmenuId =
                    dto.SubmenuId,


                //===================================================
                // Synchronization
                //===================================================

                SynchronizationTarget =
                    dto.SynchronizationTarget,


                //===================================================
                // Frontend Configuration
                //===================================================

                FrontendSolution =
                    dto.FrontendSolution,

                FrontendProject =
                    dto.FrontendProject,

                FrontendSourceFolder =
                    dto.FrontendSourceFolder,

                FrontendFeatureFolder =
                    dto.FrontendFeatureFolder,

                FrontendModuleFolder =
                    dto.FrontendModuleFolder,

                FrontendModelFolder =
                    dto.FrontendModelFolder,

                FrontendPagesFolder =
                    dto.FrontendPagesFolder,

                FrontendRoutesFolder =
                    dto.FrontendRoutesFolder,

                FrontendServicesFolder =
                    dto.FrontendServicesFolder,


                //===================================================
                // Frontend Registration
                //===================================================

                FrontendModuleRouteFile =
                    dto.FrontendModuleRouteFile,

                FrontendParentRouteFile =
                    dto.FrontendParentRouteFile,

                FrontendRoutePath =
                    dto.FrontendRoutePath,


                //===================================================
                // Backend Configuration
                //===================================================

                BackendApiProject =
                    dto.BackendApiProject,

                BackendApplicationProject =
                    dto.BackendApplicationProject,

                BackendDomainProject =
                    dto.BackendDomainProject,

                BackendInfrastructureProject =
                    dto.BackendInfrastructureProject,

                BackendControllerFolder =
                    dto.BackendControllerFolder,

                BackendDtoFolder =
                    dto.BackendDtoFolder,

                BackendInterfaceFolder =
                    dto.BackendInterfaceFolder,

                BackendEntityFolder =
                    dto.BackendEntityFolder,

                BackendRepositoryFolder =
                    dto.BackendRepositoryFolder,

                BackendConfigurationFolder =
                    dto.BackendConfigurationFolder,

                BackendDependencyInjectionFile =
                    dto.BackendDependencyInjectionFile,

                BackendDbContextFile =
                    dto.BackendDbContextFile,

                BackendProgramFile =
                    dto.BackendProgramFile,

                BackendMigrationFolder =
                    dto.BackendMigrationFolder,

                DatabaseProvider =
                    dto.DatabaseProvider,


                //===================================================
                // Status
                //===================================================

                FrontendStatus =
                    dto.SynchronizationTarget == "Frontend"
                        ? "Pending"
                        : "Not Applicable",

                BackendStatus =
                    dto.SynchronizationTarget == "Backend"
                        ? "Pending"
                        : "Not Applicable",


                //===================================================
                // Additional Information
                //===================================================

                Remarks =
                    dto.Remarks,


                //===================================================
                // Audit
                //===================================================

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow,

                IsDeleted =
                    false
            };


        _context.ProjectSynchronizations.Add(
            entity);


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "Development Management",

                EntityName =
                    "Project Synchronization",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Project Synchronization Created",

                ActivityDescription =
                    "New project synchronization registered.",

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
        UpdateProjectSynchronizationDto dto,
        long userId)
    {
        //===========================================================
        // Get Entity
        //===========================================================

        var entity =
            await _context.ProjectSynchronizations

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id
                    &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Project Synchronization not found.");
        }


        //===========================================================
        // Duplicate Validation
        //===========================================================

        bool exists =
            dto.SynchronizationLevel switch
            {
                "module" =>
                    await _context.ProjectSynchronizations.AnyAsync(x =>

                        x.Id != dto.Id

                        &&

                        !x.IsDeleted

                        &&

                        x.SynchronizationLevel == "module"

                        &&

                        x.ModuleId == dto.ModuleId),

                "menu" =>
                    await _context.ProjectSynchronizations.AnyAsync(x =>

                        x.Id != dto.Id

                        &&

                        !x.IsDeleted

                        &&

                        x.SynchronizationLevel == "menu"

                        &&

                        x.MenuId == dto.MenuId),

                "submenu" =>
                    await _context.ProjectSynchronizations.AnyAsync(x =>

                        x.Id != dto.Id

                        &&

                        !x.IsDeleted

                        &&

                        x.SynchronizationLevel == "submenu"

                        &&

                        x.SubmenuId == dto.SubmenuId),

                _ => false
            };


        if (exists)
        {
            throw new Exception(
                "Synchronization already exists.");
        }

        //===========================================================
        // Update Entity
        //===========================================================

        entity.SynchronizationLevel =
            dto.SynchronizationLevel;

        entity.ModuleId =
            dto.ModuleId;

        entity.MenuId =
            dto.MenuId;

        entity.SubmenuId =
            dto.SubmenuId;

        entity.SynchronizationTarget =
            dto.SynchronizationTarget;

        //===========================================================
        // Status
        //===========================================================

        entity.FrontendStatus =
            dto.SynchronizationTarget == "Frontend"
                ? "Pending"
                : entity.FrontendStatus;

        entity.BackendStatus =
            dto.SynchronizationTarget == "Backend"
                ? "Pending"
                : entity.BackendStatus;

        //===========================================================
        // Frontend Configuration
        //===========================================================

        entity.FrontendSolution =
            dto.FrontendSolution;

        entity.FrontendProject =
            dto.FrontendProject;

        entity.FrontendSourceFolder =
            dto.FrontendSourceFolder;

        entity.FrontendFeatureFolder =
            dto.FrontendFeatureFolder;

        entity.FrontendModuleFolder =
            dto.FrontendModuleFolder;

        entity.FrontendModelFolder =
            dto.FrontendModelFolder;

        entity.FrontendPagesFolder =
            dto.FrontendPagesFolder;

        entity.FrontendRoutesFolder =
            dto.FrontendRoutesFolder;

        entity.FrontendServicesFolder =
            dto.FrontendServicesFolder;


        //===========================================================
        // Frontend Application Registration
        //===========================================================

        entity.FrontendModuleRouteFile =
            dto.FrontendModuleRouteFile;

        entity.FrontendParentRouteFile =
            dto.FrontendParentRouteFile;

        entity.FrontendRoutePath =
            dto.FrontendRoutePath;


        //===========================================================
        // Backend Configuration
        //===========================================================

        entity.BackendApiProject =
            dto.BackendApiProject;

        entity.BackendApplicationProject =
            dto.BackendApplicationProject;

        entity.BackendDomainProject =
            dto.BackendDomainProject;

        entity.BackendInfrastructureProject =
            dto.BackendInfrastructureProject;

        entity.BackendControllerFolder =
            dto.BackendControllerFolder;

        entity.BackendDtoFolder =
            dto.BackendDtoFolder;

        entity.BackendInterfaceFolder =
            dto.BackendInterfaceFolder;

        entity.BackendEntityFolder =
            dto.BackendEntityFolder;

        entity.BackendRepositoryFolder =
            dto.BackendRepositoryFolder;

        entity.BackendConfigurationFolder =
            dto.BackendConfigurationFolder;

        entity.BackendDependencyInjectionFile =
            dto.BackendDependencyInjectionFile;

        entity.BackendDbContextFile =
            dto.BackendDbContextFile;

        entity.BackendProgramFile =
            dto.BackendProgramFile;

        entity.BackendMigrationFolder =
            dto.BackendMigrationFolder;

        entity.DatabaseProvider =
            dto.DatabaseProvider;

        entity.Remarks =
            dto.Remarks;


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
                    "Development Management",

                EntityName =
                    "Project Synchronization",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Project Synchronization Updated",

                ActivityDescription =
                    "Project synchronization updated.",

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
        //===========================================================
        // Get Entity
        //===========================================================

        var entity =
            await _context.ProjectSynchronizations

                .FirstOrDefaultAsync(x =>
                    x.Id == id
                    &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Project Synchronization not found.");
        }


        //===========================================================
        // Soft Delete
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
                    "Development Management",

                EntityName =
                    "Project Synchronization",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Project Synchronization Deleted",

                ActivityDescription =
                    "Project synchronization deleted.",

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
        //===========================================================
        // Get Last Deleted
        //===========================================================

        var entity =
            await _context.ProjectSynchronizations

                .Where(x =>
                    x.IsDeleted)

                .OrderByDescending(x =>
                    x.DeletedDate)

                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }


        //===========================================================
        // Restore
        //===========================================================

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
                    "Development Management",

                EntityName =
                    "Project Synchronization",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Project Synchronization Restored",

                ActivityDescription =
                    "Project synchronization restored.",

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
    // Get History
    //===============================================================

    public async Task<List<ActivityHistoryDto>> GetHistoryAsync()
    {
        return await _context.ActivityHistories

            .AsNoTracking()

            .Where(x =>

                x.Module ==
                    "Development Management"

                &&

                x.EntityName ==
                    "Project Synchronization")

            .OrderByDescending(x =>
                x.PerformedDate)

            .Select(x => new ActivityHistoryDto
            {
                Id =
                    x.Id,

                Module =
                    x.Module,

                EntityName =
                    x.EntityName,

                EntityId =
                    x.EntityId,

                ActivityType =
                    x.ActivityType,

                ActivityTitle =
                    x.ActivityTitle,

                ActivityDescription =
                    x.ActivityDescription,

                PerformedBy =
                    x.PerformedBy,

                PerformedByName =
                    x.PerformedByName,

                PerformedDate =
                    x.PerformedDate
            })

            .ToListAsync();
    }


    //===============================================================
    // Get Modules
    //===============================================================

    public async Task<List<ModuleDto>> GetModulesAsync()
    {
        return await _context.NavigationModules

            .AsNoTracking()

            .Where(module =>

                !module.IsDeleted

                &&

                !_context.ProjectSynchronizations.Any(sync =>

                    !sync.IsDeleted

                    &&

                    sync.SynchronizationLevel == "module"

                    &&

                    sync.ModuleId == module.Id))

            .OrderBy(module =>
                module.DisplayOrder)

            .ThenBy(module =>
                module.Name)

            .Select(module => new ModuleDto
            {
                Id =
                    module.Id,

                Code =
                    module.Code,

                Name =
                    module.Name
            })

            .ToListAsync();
    }


    //===============================================================
    // Get Menus
    //===============================================================

    public async Task<List<MenuDto>> GetMenusAsync()
    {
        return await _context.NavigationMenus

            .AsNoTracking()

            .Where(menu =>

                !menu.IsDeleted

                &&

                !_context.ProjectSynchronizations.Any(sync =>

                    !sync.IsDeleted

                    &&

                    sync.SynchronizationLevel == "menu"

                    &&

                    sync.MenuId == menu.Id))

            .OrderBy(menu =>
                menu.DisplayOrder)

            .ThenBy(menu =>
                menu.Name)

            .Select(menu => new MenuDto
            {
                Id =
                    menu.Id,

                Code =
                    menu.Code,

                Name =
                    menu.Name
            })

            .ToListAsync();
    }


    //===============================================================
    // Get Submenus
    //===============================================================

    public async Task<List<SubmenuDto>> GetSubmenusAsync()
    {
        return await _context.NavigationSubmenus

            .AsNoTracking()

            .Where(submenu =>

                !submenu.IsDeleted

                &&

                !_context.ProjectSynchronizations.Any(sync =>

                    !sync.IsDeleted

                    &&

                    sync.SynchronizationLevel == "submenu"

                    &&

                    sync.SubmenuId == submenu.Id))

            .OrderBy(submenu =>
                submenu.DisplayOrder)

            .ThenBy(submenu =>
                submenu.Name)

            .Select(submenu => new SubmenuDto
            {
                Id =
                    submenu.Id,

                Code =
                    submenu.Code,

                Name =
                    submenu.Name
            })

            .ToListAsync();
    }

    //===============================================================
    // Get All Modules
    //===============================================================

    public async Task<List<ModuleDto>> GetAllModulesAsync()
    {
        return await _context.NavigationModules

            .AsNoTracking()

            .Where(module =>
                !module.IsDeleted)

            .OrderBy(module =>
                module.DisplayOrder)

            .ThenBy(module =>
                module.Name)

            .Select(module => new ModuleDto
            {
                Id =
                    module.Id,

                Code =
                    module.Code,

                Name =
                    module.Name
            })

            .ToListAsync();
    }

    //===============================================================
    // Get All Menus
    //===============================================================

    public async Task<List<MenuDto>> GetAllMenusAsync()
    {
        return await _context.NavigationMenus

            .AsNoTracking()

            .Where(menu =>
                !menu.IsDeleted)

            .OrderBy(menu =>
                menu.DisplayOrder)

            .ThenBy(menu =>
                menu.Name)

            .Select(menu => new MenuDto
            {
                Id =
                    menu.Id,

                Code =
                    menu.Code,

                Name =
                    menu.Name
            })

            .ToListAsync();
    }

    //===============================================================
    // Get All Submenus
    //===============================================================

    public async Task<List<SubmenuDto>> GetAllSubmenusAsync()
    {
        return await _context.NavigationSubmenus

            .AsNoTracking()

            .Where(submenu =>
                !submenu.IsDeleted)

            .OrderBy(submenu =>
                submenu.DisplayOrder)

            .ThenBy(submenu =>
                submenu.Name)

            .Select(submenu => new SubmenuDto
            {
                Id =
                    submenu.Id,

                Code =
                    submenu.Code,

                Name =
                    submenu.Name
            })

            .ToListAsync();
    }

}