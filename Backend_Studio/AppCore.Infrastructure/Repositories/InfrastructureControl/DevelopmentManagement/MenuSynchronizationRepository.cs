//===============================================================
// Namespaces
//===============================================================

using System.IO;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.Interfaces;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.MenuSynchronization;



//===============================================================
// Menu Synchronization Repository
//===============================================================

public class MenuSynchronizationRepository
    : IMenuSynchronizationRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _context;

    private readonly IMenuSynchronizationEngine
        _menuSynchronizationEngine;


    //===========================================================
    // Constructor
    //===========================================================

    public MenuSynchronizationRepository
    (
        AppDbContext context,

        IMenuSynchronizationEngine
            menuSynchronizationEngine
    )
    {
        _context =
            context;

        _menuSynchronizationEngine =
            menuSynchronizationEngine;
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<MenuSynchronizationDefaultsDto> GetDefaultsAsync
    (
        string synchronizationType
    )
    {
        return await Task.FromResult
        (
            new MenuSynchronizationDefaultsDto
            {
                //===================================================
                // Navigation
                //===================================================

                ModuleId =
                    0,

                ModuleCode =
                    string.Empty,

                ModuleName =
                    string.Empty,

                MenuId =
                    0,

                MenuCode =
                    string.Empty,

                MenuName =
                    string.Empty,


                //===================================================
                // Synchronization Type
                //===================================================

                SynchronizationType =
                    synchronizationType,


                //===================================================
                // Frontend Target Location
                //===================================================

                FrontendSolution =
                    string.Empty,

                FrontendProject =
                    string.Empty,

                FrontendSourceFolder =
                    string.Empty,

                FrontendFeatureFolder =
                    string.Empty,


                //===================================================
                // Frontend Menu Structure
                //===================================================

                FrontendMenuFolder =
                    string.Empty,

                FrontendModelsFolder =
                    string.Empty,

                FrontendServicesFolder =
                    string.Empty,

                FrontendPagesFolder =
                    string.Empty,

                FrontendRoutesFolder =
                    string.Empty,


                //===================================================
                // Frontend Application Registration
                //===================================================

                FrontendMenuRouteFile =
                    string.Empty,

                FrontendModuleRouteFile =
                    string.Empty,

                FrontendApplicationRouteFile =
                    string.Empty,


                //===================================================
                // Backend Target Location
                //===================================================

                BackendSolution =
                    string.Empty,

                BackendApplicationProject =
                    string.Empty,

                BackendDomainProject =
                    string.Empty,

                BackendInfrastructureProject =
                    string.Empty,


                //===================================================
                // Backend Menu Structure
                //===================================================

                BackendControllerFolder =
                    string.Empty,

                BackendApplicationFolder =
                    string.Empty,

                BackendDomainFolder =
                    string.Empty,

                BackendConfigurationFolder =
                    string.Empty,

                BackendRepositoryFolder =
                    string.Empty,


                //===================================================
                // Synchronization
                //===================================================

                Status =
                    "Pending",


                //===================================================
                // Configuration
                //===================================================

                Remarks =
                    string.Empty,


                //===================================================
                // Last Synchronization
                //===================================================

                LastSynchronizedBy =
                    null,

                LastSynchronizedDate =
                    null,

                LastSynchronizationResult =
                    string.Empty,


                //===================================================
                // Status
                //===================================================

                IsActive =
                    true
            }
        );
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<MenuSynchronizationDto>> GetAllAsync
    (
        string synchronizationType
    )
    {
        return await _context.MenuSynchronizations

            //=======================================================
            // Filter
            //=======================================================

            .Where
            (
                x =>

                    !x.IsDeleted

                    &&

                    x.SynchronizationType ==
                    synchronizationType
            )


            //=======================================================
            // Order
            //=======================================================

            .OrderBy
            (
                x =>
                    x.ModuleCode
            )

            .ThenBy
            (
                x =>
                    x.MenuCode
            )


            //=======================================================
            // Projection
            //=======================================================

            .Select
            (
                x => new MenuSynchronizationDto
                {
                    //===================================================
                    // Primary Key
                    //===================================================

                    Id =
                        x.Id,


                    //===================================================
                    // Navigation
                    //===================================================

                    ModuleId =
                        x.ModuleId,

                    ModuleCode =
                        x.ModuleCode,

                    ModuleName =
                        x.ModuleName,

                    MenuId =
                        x.MenuId,

                    MenuCode =
                        x.MenuCode,

                    MenuName =
                        x.MenuName,


                    //===================================================
                    // Synchronization Type
                    //===================================================

                    SynchronizationType =
                        x.SynchronizationType,


                    //===================================================
                    // Frontend Target Location
                    //===================================================

                    FrontendSolution =
                        x.FrontendSolution,

                    FrontendProject =
                        x.FrontendProject,

                    FrontendSourceFolder =
                        x.FrontendSourceFolder,

                    FrontendFeatureFolder =
                        x.FrontendFeatureFolder,


                    //===================================================
                    // Frontend Menu Structure
                    //===================================================

                    FrontendMenuFolder =
                        x.FrontendMenuFolder,

                    FrontendModelsFolder =
                        x.FrontendModelsFolder,

                    FrontendServicesFolder =
                        x.FrontendServicesFolder,

                    FrontendPagesFolder =
                        x.FrontendPagesFolder,

                    FrontendRoutesFolder =
                        x.FrontendRoutesFolder,


                    //===================================================
                    // Frontend Application Registration
                    //===================================================

                    FrontendMenuRouteFile =
                        x.FrontendMenuRouteFile,

                    FrontendModuleRouteFile =
                        x.FrontendModuleRouteFile,

                    FrontendApplicationRouteFile =
                        x.FrontendApplicationRouteFile,


                    //===================================================
                    // Backend Target Location
                    //===================================================

                    BackendSolution =
                        x.BackendSolution,

                    BackendApplicationProject =
                        x.BackendApplicationProject,

                    BackendDomainProject =
                        x.BackendDomainProject,

                    BackendInfrastructureProject =
                        x.BackendInfrastructureProject,


                    //===================================================
                    // Backend Menu Structure
                    //===================================================

                    BackendControllerFolder =
                        x.BackendControllerFolder,

                    BackendApplicationFolder =
                        x.BackendApplicationFolder,

                    BackendDomainFolder =
                        x.BackendDomainFolder,

                    BackendRepositoryFolder =
                        x.BackendRepositoryFolder,

                    BackendConfigurationFolder =
                        x.BackendConfigurationFolder,


                    //===================================================
                    // Synchronization
                    //===================================================

                    Status =
                        x.Status,


                    //===================================================
                    // Configuration
                    //===================================================

                    Remarks =
                        x.Remarks,


                    //===================================================
                    // Last Synchronization
                    //===================================================

                    LastSynchronizedBy =
                        x.LastSynchronizedBy,

                    LastSynchronizedDate =
                        x.LastSynchronizedDate,

                    LastSynchronizationResult =
                        x.LastSynchronizationResult,


                    //===================================================
                    // Status
                    //===================================================

                    IsActive =
                        x.IsActive,


                    //===================================================
                    // Audit
                    //===================================================

                    CreatedDate =
                        x.CreatedDate
                }
            )


            //=======================================================
            // Execute
            //=======================================================

            .ToListAsync();
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<MenuSynchronizationDto?> GetByIdAsync
    (
        long id
    )
    {
        return await _context.MenuSynchronizations

            .Where
            (
                x =>

                    x.Id ==
                    id

                    &&

                    !x.IsDeleted
            )

            .Select
            (
                x => new MenuSynchronizationDto
                {
                    //===================================================
                    // Primary Key
                    //===================================================

                    Id =
                        x.Id,


                    //===================================================
                    // Navigation
                    //===================================================

                    ModuleId =
                        x.ModuleId,

                    ModuleCode =
                        x.ModuleCode,

                    ModuleName =
                        x.ModuleName,

                    MenuId =
                        x.MenuId,

                    MenuCode =
                        x.MenuCode,

                    MenuName =
                        x.MenuName,


                    //===================================================
                    // Synchronization Type
                    //===================================================

                    SynchronizationType =
                        x.SynchronizationType,


                    //===================================================
                    // Frontend Target Location
                    //===================================================

                    FrontendSolution =
                        x.FrontendSolution,

                    FrontendProject =
                        x.FrontendProject,

                    FrontendSourceFolder =
                        x.FrontendSourceFolder,

                    FrontendFeatureFolder =
                        x.FrontendFeatureFolder,


                    //===================================================
                    // Frontend Menu Structure
                    //===================================================

                    FrontendMenuFolder =
                        x.FrontendMenuFolder,

                    FrontendModelsFolder =
                        x.FrontendModelsFolder,

                    FrontendServicesFolder =
                        x.FrontendServicesFolder,

                    FrontendPagesFolder =
                        x.FrontendPagesFolder,

                    FrontendRoutesFolder =
                        x.FrontendRoutesFolder,


                    //===================================================
                    // Frontend Route Ownership
                    //===================================================

                    FrontendMenuRouteFile =
                        x.FrontendMenuRouteFile,

                    FrontendModuleRouteFile =
                        x.FrontendModuleRouteFile,

                    FrontendApplicationRouteFile =
                        x.FrontendApplicationRouteFile,


                    //===================================================
                    // Backend Target Location
                    //===================================================

                    BackendSolution =
                        x.BackendSolution,

                    BackendApplicationProject =
                        x.BackendApplicationProject,

                    BackendDomainProject =
                        x.BackendDomainProject,

                    BackendInfrastructureProject =
                        x.BackendInfrastructureProject,


                    //===================================================
                    // Backend Menu Structure
                    //===================================================

                    BackendControllerFolder =
                        x.BackendControllerFolder,

                    BackendApplicationFolder =
                        x.BackendApplicationFolder,

                    BackendDomainFolder =
                        x.BackendDomainFolder,

                    BackendConfigurationFolder =
                        x.BackendConfigurationFolder,

                    BackendRepositoryFolder =
                        x.BackendRepositoryFolder,


                    //===================================================
                    // Synchronization
                    //===================================================

                    Status =
                        x.Status,


                    //===================================================
                    // Configuration
                    //===================================================

                    Remarks =
                        x.Remarks,


                    //===================================================
                    // Last Synchronization
                    //===================================================

                    LastSynchronizedBy =
                        x.LastSynchronizedBy,

                    LastSynchronizedDate =
                        x.LastSynchronizedDate,

                    LastSynchronizationResult =
                        x.LastSynchronizationResult,


                    //===================================================
                    // Status
                    //===================================================

                    IsActive =
                        x.IsActive,


                    //===================================================
                    // Audit
                    //===================================================

                    CreatedDate =
                        x.CreatedDate
                }
            )

            .FirstOrDefaultAsync();
    }



    //===========================================================
    // Analyze
    //===========================================================

    public async Task<MenuSynchronizationDto> AnalyzeAsync
    (
        long moduleId,

        long menuId,

        string synchronizationType
    )
    {
        //=======================================================
        // Diagnostics
        //=======================================================

        Console.WriteLine
        (
            "================================================="
        );

        Console.WriteLine
        (
            "MENU SYNCHRONIZATION ANALYZE"
        );

        Console.WriteLine
        (
            $"Requested Module Id : {moduleId}"
        );

        Console.WriteLine
        (
            $"Requested Menu Id   : {menuId}"
        );

        Console.WriteLine
        (
            $"Requested Type      : '{synchronizationType}'"
        );

        Console.WriteLine
        (
            "================================================="
        );


        //=======================================================
        // Solution Root
        //=======================================================

        var currentDirectory =
            Environment.CurrentDirectory;


        var solutionRoot =
            currentDirectory;


        while
        (
            !Directory.Exists
            (
                Path.Combine
                (
                    solutionRoot,
                    "Backend_Studio"
                )
            )

            &&

            Directory.GetParent
            (
                solutionRoot
            ) != null
        )
        {
            solutionRoot =
                Directory
                    .GetParent
                    (
                        solutionRoot
                    )!
                    .FullName;
        }


        //=======================================================
        // Studio Roots
        //=======================================================

        var frontendRoot =
            Path.Combine
            (
                solutionRoot,
                "Frontend_Studio",
                "Studio_UI"
            );


        var backendRoot =
            Path.Combine
            (
                solutionRoot,
                "Backend_Studio"
            );


        //=======================================================
        // Existing Synchronization
        //=======================================================

        var existing =
            await _context.MenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        !x.IsDeleted

                        &&

                        x.ModuleId ==
                        moduleId

                        &&

                        x.MenuId ==
                        menuId

                        &&

                        x.SynchronizationType ==
                        synchronizationType
                );


        if
        (
            existing != null
        )
        {
            Console.WriteLine
            (
                $"FOUND EXISTING RECORD : Id = {existing.Id}"
            );


            var result =
                await GetByIdAsync
                (
                    existing.Id
                )

                ?? new MenuSynchronizationDto();


            //===================================================
            // Restore Missing Module Route Reference
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace
                (
                    result.FrontendModuleRouteFile
                )
            )
            {
                var moduleEntity =
                    await _context.NavigationModules

                        .FirstOrDefaultAsync
                        (
                            x =>

                                x.Id ==
                                moduleId

                                &&

                                !x.IsDeleted
                        );


                if
                (
                    moduleEntity != null
                )
                {
                    var existingFeatureName =
                        NormalizeFrontendPhysicalName
                        (
                            moduleEntity.Name
                        );


                    result.FrontendModuleRouteFile =
                        Path.Combine
                        (
                            frontendRoot,

                            "src",

                            "features",

                            existingFeatureName,

                            "routes",

                            $"{existingFeatureName}.routes.ts"
                        );
                }
            }


            return result;
        }


        Console.WriteLine
        (
            "NO EXISTING SYNCHRONIZATION FOUND."
        );


        //=======================================================
        // Load Module
        //=======================================================

        var module =
            await _context.NavigationModules

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        moduleId

                        &&

                        !x.IsDeleted
                );


        if
        (
            module == null
        )
        {
            Console.WriteLine
            (
                "NAVIGATION MODULE NOT FOUND."
            );


            return new MenuSynchronizationDto();
        }


        //=======================================================
        // Load Menu
        //=======================================================

        var menu =
            await _context.NavigationMenus

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        menuId

                        &&

                        !x.IsDeleted
                );


        if
        (
            menu == null
        )
        {
            Console.WriteLine
            (
                "NAVIGATION MENU NOT FOUND."
            );


            return new MenuSynchronizationDto();
        }


        //=======================================================
        // Build Frontend Names
        //=======================================================

        var featureName =
            NormalizeFrontendPhysicalName
            (
                module.Name
            );


        var menuName =
            NormalizeFrontendPhysicalName
            (
                menu.Name
            );


        //=======================================================
        // Build Backend Physical Names
        //=======================================================
        //
        // Display/database names remain unchanged.
        //
        // Physical folder names MUST NOT contain spaces.
        //
        // Example:
        //
        // Account Settings -> AccountSettings
        // Account Class    -> AccountClass
        //
        //=======================================================

        var backendModuleName =
            NormalizePhysicalName
            (
                module.Name
            );


        var backendMenuName =
            NormalizePhysicalName
            (
                menu.Name
            );


        //=======================================================
        // Create Configuration
        //=======================================================

        var configuration =
            new MenuSynchronizationDto
            {
                //===================================================
                // Navigation
                //===================================================

                ModuleId =
                    module.Id,

                ModuleCode =
                    module.Code,

                ModuleName =
                    module.Name,


                MenuId =
                    menu.Id,

                MenuCode =
                    menu.Code,

                MenuName =
                    menu.Name,


                //===================================================
                // Synchronization Type
                //===================================================

                SynchronizationType =
                    synchronizationType,


                //===================================================
                // Synchronization
                //===================================================

                Status =
                    "Ready",


                //===================================================
                // Configuration
                //===================================================

                Remarks =
                    string.Empty,


                //===================================================
                // Status
                //===================================================

                IsActive =
                    menu.IsActive
            };


        //=======================================================
        // Analyze Frontend
        //=======================================================

        AnalyzeFrontend
        (
            configuration,

            frontendRoot,

            featureName,

            menuName
        );


        //=======================================================
        // Analyze Backend
        //=======================================================

        AnalyzeBackend
        (
            configuration,

            backendRoot,

            backendModuleName,

            backendMenuName
        );


        //=======================================================
        // Completed
        //=======================================================

        Console.WriteLine
        (
            "RETURNING NEW CONFIGURATION."
        );


        return configuration;
    }



    //===========================================================
    // Analyze Frontend
    //===========================================================

    private void AnalyzeFrontend
    (
        MenuSynchronizationDto configuration,

        string frontendRoot,

        string featureName,

        string menuName
    )
    {
        //=======================================================
        // Frontend Target Location
        //=======================================================

        configuration.FrontendSolution =
            frontendRoot;


        configuration.FrontendProject =
            "Studio_UI";


        configuration.FrontendSourceFolder =
            Path.Combine
            (
                frontendRoot,
                "src",
                "features"
            );


        configuration.FrontendFeatureFolder =
            featureName;


        //=======================================================
        // Frontend Menu Structure
        //=======================================================

        configuration.FrontendMenuFolder =
            Path.Combine
            (
                configuration.FrontendSourceFolder,

                featureName,

                menuName
            );


        configuration.FrontendModelsFolder =
            Path.Combine
            (
                configuration.FrontendMenuFolder,

                "models"
            );


        configuration.FrontendServicesFolder =
            Path.Combine
            (
                configuration.FrontendMenuFolder,

                "services"
            );


        configuration.FrontendPagesFolder =
            Path.Combine
            (
                configuration.FrontendMenuFolder,

                "pages"
            );


        configuration.FrontendRoutesFolder =
            Path.Combine
            (
                configuration.FrontendMenuFolder,

                "routes"
            );


        //=======================================================
        // Frontend Menu Route File
        //=======================================================

        configuration.FrontendMenuRouteFile =
            Path.Combine
            (
                configuration.FrontendRoutesFolder,

                $"{menuName}.routes.ts"
            );


        //=======================================================
        // Frontend Module Route File
        //=======================================================
        //
        // Menu Synchronization does not create module route.
        //
        // It only registers the Menu inside the existing
        // Module route.
        //
        //=======================================================

        configuration.FrontendModuleRouteFile =
            Path.Combine
            (
                configuration.FrontendSourceFolder,

                featureName,

                "routes",

                $"{featureName}.routes.ts"
            );


        //=======================================================
        // Frontend Application Route File
        //=======================================================

        configuration.FrontendApplicationRouteFile =
            Path.Combine
            (
                frontendRoot,

                "src",

                "app",

                "app.routes.ts"
            );
    }



    //===========================================================
    // Analyze Backend
    //===========================================================

    private void AnalyzeBackend
    (
        MenuSynchronizationDto configuration,

        string backendRoot,

        string moduleName,

        string menuName
    )
    {
        //=======================================================
        // Backend Target Location
        //=======================================================

        configuration.BackendSolution =
            backendRoot;


        configuration.BackendApplicationProject =
            "AppCore.Application";


        configuration.BackendDomainProject =
            "AppCore.Domain";


        configuration.BackendInfrastructureProject =
            "AppCore.Infrastructure";


        //=======================================================
        // Backend Menu Folder Structure
        //=======================================================
        //
        // IMPORTANT:
        //
        // moduleName and menuName have already been normalized
        // by NormalizePhysicalName().
        //
        // Therefore no backend physical folder generated here
        // can contain spaces.
        //
        //=======================================================


        //=======================================================
        // API Controller Folder
        //=======================================================

        configuration.BackendControllerFolder =
            Path.Combine
            (
                backendRoot,

                "AppCore.Api",

                "Controllers",

                moduleName,

                menuName
            );


        //=======================================================
        // Application Folder
        //=======================================================

        configuration.BackendApplicationFolder =
            Path.Combine
            (
                backendRoot,

                "AppCore.Application",

                moduleName,

                menuName
            );


        //=======================================================
        // Domain Folder
        //=======================================================

        configuration.BackendDomainFolder =
            Path.Combine
            (
                backendRoot,

                "AppCore.Domain",

                moduleName,

                menuName
            );


        //=======================================================
        // Infrastructure Configuration Folder
        //=======================================================

        configuration.BackendConfigurationFolder =
            Path.Combine
            (
                backendRoot,

                "AppCore.Infrastructure",

                "Configurations",

                moduleName,

                menuName
            );


        //=======================================================
        // Infrastructure Repository Folder
        //=======================================================

        configuration.BackendRepositoryFolder =
            Path.Combine
            (
                backendRoot,

                "AppCore.Infrastructure",

                "Repositories",

                moduleName,

                menuName
            );
    }



    //===========================================================
    // Normalize Frontend Physical Name
    //===========================================================
    //
    // Used ONLY for frontend physical file/folder names.
    //
    // Database/display names are never modified.
    //
    // Only letters, numbers and hyphen are allowed.
    //
    // Spaces are converted to hyphens.
    //
    // Technical/special characters are removed.
    //
    // Example:
    //
    // Account Settings -> account-settings
    // Account & Class  -> account-class
    //
    //===========================================================

    private static string NormalizeFrontendPhysicalName
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                value
            )
        )
        {
            return string.Empty;
        }


        var result =
            new System.Text.StringBuilder();


        var lastWasHyphen =
            false;


        foreach
        (
            var character in
            value.Trim()
        )
        {
            if
            (
                char.IsLetterOrDigit
                (
                    character
                )
            )
            {
                result.Append
                (
                    char.ToLowerInvariant
                    (
                        character
                    )
                );

                lastWasHyphen =
                    false;

                continue;
            }


            if
            (
                character == '-'
                ||
                char.IsWhiteSpace
                (
                    character
                )
            )
            {
                if
                (
                    result.Length > 0
                    &&
                    !lastWasHyphen
                )
                {
                    result.Append
                    (
                        '-'
                    );

                    lastWasHyphen =
                        true;
                }
            }
        }


        if
        (
            lastWasHyphen
        )
        {
            result.Length--;
        }


        return result.ToString();
    }



    //===========================================================
    // Normalize Backend Physical Name
    //===========================================================
    //
    // Used ONLY for backend physical file/folder names.
    //
    // Database/display names are never modified.
    //
    // Spaces and technical/special characters are removed.
    //
    // Example:
    //
    // Account Settings -> AccountSettings
    // Account & Class  -> AccountClass
    //
    //===========================================================

    private static string NormalizePhysicalName
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                value
            )
        )
        {
            return string.Empty;
        }


        return string.Concat
        (
            value
                .Trim()
                .Where
                (
                    character =>
                        char.IsLetterOrDigit
                        (
                            character
                        )
                )
        );
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<bool> SynchronizeAsync
    (
        long id
    )
    {
        //=======================================================
        // Execute Synchronization
        //=======================================================

        var result =
            await _menuSynchronizationEngine
                .SynchronizeAsync
                (
                    id
                );


        //=======================================================
        // Completed
        //=======================================================

        return result.Success;
    }

    //===========================================================
    // Validate Rollback
    //===========================================================

    public async Task<MenuSynchronizationRollbackValidationDto?>
        ValidateRollbackAsync
    (
        long id
    )
    {
        //=======================================================
        // Load Menu Synchronization
        //=======================================================

        var synchronization =
            await _context.MenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        //=======================================================
        // Synchronization Not Found
        //=======================================================

        if
        (
            synchronization == null
        )
        {
            return null;
        }



        //=======================================================
        // No Navigation Dependency Check
        //=======================================================
        //
        // IMPORTANT:
        //
        // Do NOT check:
        //
        // NavigationSubmenus
        // SubmenuSynchronizations
        // NavigationMenus
        //
        // These are database master/configuration data.
        //
        // They are created before synchronization and must not
        // block rollback.
        //
        //=======================================================



        //=======================================================
        // Rollback Allowed
        //=======================================================

        return new MenuSynchronizationRollbackValidationDto
        {
            CanRollback =
                true,

            Message =
                "Menu rollback is allowed."
        };
    }

    //===========================================================
    // Rollback
    //===========================================================

    public async Task<bool> RollbackAsync
    (
        long id
    )
    {
        //=======================================================
        // Execute Rollback
        //=======================================================

        var result =
            await _menuSynchronizationEngine
                .RollbackAsync
                (
                    id
                );


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !result.Success
        )
        {
            throw new InvalidOperationException
            (
                result.Message
            );
        }


        //=======================================================
        // Completed
        //=======================================================

        return true;
    }



    //===========================================================
    // Exists By Menu
    //===========================================================

    public async Task<bool> ExistsByMenuAsync
    (
        long menuId,

        string synchronizationType,

        long? excludeId = null
    )
    {
        return await _context.MenuSynchronizations.AnyAsync
        (
            x =>

                !x.IsDeleted

                &&

                x.MenuId ==
                menuId

                &&

                x.SynchronizationType ==
                synchronizationType

                &&

                (
                    !excludeId.HasValue

                    ||

                    x.Id !=
                    excludeId.Value
                )
        );
    }



    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync
    (
        CreateMenuSynchronizationDto dto
    )
    {
        const long userId =
            1;


        //=======================================================
        // Duplicate Check
        //=======================================================

        var exists =
            await ExistsByMenuAsync
            (
                dto.MenuId,

                dto.SynchronizationType
            );


        if
        (
            exists
        )
        {
            throw new InvalidOperationException
            (
                $"A {dto.SynchronizationType} synchronization already exists for '{dto.MenuName}'."
            );
        }


        //=======================================================
        // Create Entity
        //=======================================================

        var synchronization =
            new AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement.MenuSynchronization
            {
                //===================================================
                // Navigation
                //===================================================

                ModuleId =
                    dto.ModuleId,

                ModuleCode =
                    dto.ModuleCode,

                ModuleName =
                    dto.ModuleName,

                MenuId =
                    dto.MenuId,

                MenuCode =
                    dto.MenuCode,

                MenuName =
                    dto.MenuName,


                //===================================================
                // Synchronization Type
                //===================================================

                SynchronizationType =
                    dto.SynchronizationType,


                //===================================================
                // Frontend Target Location
                //===================================================

                FrontendSolution =
                    dto.FrontendSolution,

                FrontendProject =
                    dto.FrontendProject,

                FrontendSourceFolder =
                    dto.FrontendSourceFolder,

                FrontendFeatureFolder =
                    dto.FrontendFeatureFolder,


                //===================================================
                // Frontend Menu Structure
                //===================================================

                FrontendMenuFolder =
                    dto.FrontendMenuFolder,

                FrontendModelsFolder =
                    dto.FrontendModelsFolder,

                FrontendServicesFolder =
                    dto.FrontendServicesFolder,

                FrontendPagesFolder =
                    dto.FrontendPagesFolder,

                FrontendRoutesFolder =
                    dto.FrontendRoutesFolder,


                //===================================================
                // Frontend Application Registration
                //===================================================

                FrontendMenuRouteFile =
                    dto.FrontendMenuRouteFile,

                FrontendModuleRouteFile =
                    dto.FrontendModuleRouteFile,


                //===================================================
                // Backend Target Location
                //===================================================

                BackendSolution =
                    dto.BackendSolution,

                BackendApplicationProject =
                    dto.BackendApplicationProject,

                BackendDomainProject =
                    dto.BackendDomainProject,

                BackendInfrastructureProject =
                    dto.BackendInfrastructureProject,


                //===================================================
                // Backend Menu Folder Structure
                //===================================================

                BackendControllerFolder =
                    dto.BackendControllerFolder,

                BackendApplicationFolder =
                    dto.BackendApplicationFolder,

                BackendDomainFolder =
                    dto.BackendDomainFolder,

                BackendRepositoryFolder =
                    dto.BackendRepositoryFolder,

                BackendConfigurationFolder =
                    dto.BackendConfigurationFolder,


                //===================================================
                // Synchronization
                //===================================================

                Status =
                    dto.Status,


                //===================================================
                // Configuration
                //===================================================

                Remarks =
                    dto.Remarks,


                //===================================================
                // Last Synchronization
                //===================================================

                LastSynchronizedBy =
                    dto.LastSynchronizedBy,

                LastSynchronizedDate =
                    dto.LastSynchronizedDate,

                LastSynchronizationResult =
                    dto.LastSynchronizationResult,


                //===================================================
                // Status
                //===================================================

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,


                //===================================================
                // Audit
                //===================================================

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context.MenuSynchronizations.Add
        (
            synchronization
        );


        await _context.SaveChangesAsync();


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add
        (
            new ActivityHistory
            {
                Module =
                    "Infrastructure Control",

                EntityName =
                    "Menu Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Menu Synchronization Created",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration created for '{synchronization.MenuName}'.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return synchronization.Id;
    }



    //===========================================================
    // Update
    //===========================================================

    public async Task<bool> UpdateAsync
    (
        UpdateMenuSynchronizationDto dto
    )
    {
        const long userId =
            1;


        //=======================================================
        // Duplicate Check
        //=======================================================

        var exists =
            await ExistsByMenuAsync
            (
                dto.MenuId,

                dto.SynchronizationType,

                dto.Id
            );


        if
        (
            exists
        )
        {
            throw new InvalidOperationException
            (
                $"A {dto.SynchronizationType} synchronization already exists for '{dto.MenuName}'."
            );
        }


        //=======================================================
        // Load Entity
        //=======================================================

        var synchronization =
            await _context.MenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        dto.Id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return false;
        }


        //=======================================================
        // Navigation
        //=======================================================

        synchronization.ModuleId =
            dto.ModuleId;

        synchronization.ModuleCode =
            dto.ModuleCode;

        synchronization.ModuleName =
            dto.ModuleName;

        synchronization.MenuId =
            dto.MenuId;

        synchronization.MenuCode =
            dto.MenuCode;

        synchronization.MenuName =
            dto.MenuName;


        //=======================================================
        // Synchronization Type
        //=======================================================

        synchronization.SynchronizationType =
            dto.SynchronizationType;


        //=======================================================
        // Frontend Target Location
        //=======================================================

        synchronization.FrontendSolution =
            dto.FrontendSolution;

        synchronization.FrontendProject =
            dto.FrontendProject;

        synchronization.FrontendSourceFolder =
            dto.FrontendSourceFolder;

        synchronization.FrontendFeatureFolder =
            dto.FrontendFeatureFolder;


        //=======================================================
        // Frontend Menu Structure
        //=======================================================

        synchronization.FrontendMenuFolder =
            dto.FrontendMenuFolder;

        synchronization.FrontendModelsFolder =
            dto.FrontendModelsFolder;

        synchronization.FrontendServicesFolder =
            dto.FrontendServicesFolder;

        synchronization.FrontendPagesFolder =
            dto.FrontendPagesFolder;

        synchronization.FrontendRoutesFolder =
            dto.FrontendRoutesFolder;


        //=======================================================
        // Frontend Application Registration
        //=======================================================

        synchronization.FrontendMenuRouteFile =
            dto.FrontendMenuRouteFile;

        synchronization.FrontendModuleRouteFile =
            dto.FrontendModuleRouteFile;


        //=======================================================
        // Backend Target Location
        //=======================================================

        synchronization.BackendSolution =
            dto.BackendSolution;

        synchronization.BackendApplicationProject =
            dto.BackendApplicationProject;

        synchronization.BackendDomainProject =
            dto.BackendDomainProject;

        synchronization.BackendInfrastructureProject =
            dto.BackendInfrastructureProject;


        //=======================================================
        // Backend Menu Folder Structure
        //=======================================================

        synchronization.BackendControllerFolder =
            dto.BackendControllerFolder;

        synchronization.BackendApplicationFolder =
            dto.BackendApplicationFolder;

        synchronization.BackendDomainFolder =
            dto.BackendDomainFolder;

        synchronization.BackendRepositoryFolder =
            dto.BackendRepositoryFolder;

        synchronization.BackendConfigurationFolder =
            dto.BackendConfigurationFolder;


        //=======================================================
        // Synchronization
        //=======================================================

        synchronization.Status =
            dto.Status;


        //=======================================================
        // Configuration
        //=======================================================

        synchronization.Remarks =
            dto.Remarks;


        //=======================================================
        // Last Synchronization
        //=======================================================

        synchronization.LastSynchronizedBy =
            dto.LastSynchronizedBy;

        synchronization.LastSynchronizedDate =
            dto.LastSynchronizedDate;

        synchronization.LastSynchronizationResult =
            dto.LastSynchronizationResult;


        //=======================================================
        // Status
        //=======================================================

        synchronization.IsActive =
            dto.IsActive;


        //=======================================================
        // Audit
        //=======================================================

        synchronization.ModifiedBy =
            userId;

        synchronization.ModifiedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add
        (
            new ActivityHistory
            {
                Module =
                    "Infrastructure Control",

                EntityName =
                    "Menu Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Menu Synchronization Updated",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration updated for '{synchronization.MenuName}'.",

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
    // Delete
    //===========================================================

    public async Task<bool> DeleteAsync
    (
        long id
    )
    {
        const long userId =
            1;


        var synchronization =
            await _context.MenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return false;
        }


        //=======================================================
        // Soft Delete
        //=======================================================

        synchronization.IsDeleted =
            true;

        synchronization.DeletedBy =
            userId;

        synchronization.DeletedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add
        (
            new ActivityHistory
            {
                Module =
                    "Infrastructure Control",

                EntityName =
                    "Menu Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Menu Synchronization Deleted",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration deleted for '{synchronization.MenuName}'.",

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
    // Restore
    //===========================================================

    public async Task<bool> RestoreAsync
    (
        string synchronizationType
    )
    {
        const long userId =
            1;


        //=======================================================
        // Load Deleted Entity
        //=======================================================

        var entity =
            await _context.MenuSynchronizations

                .Where
                (
                    x =>

                        x.IsDeleted

                        &&

                        x.SynchronizationType ==
                        synchronizationType
                )

                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )

                .FirstOrDefaultAsync();


        if
        (
            entity == null
        )
        {
            return false;
        }


        //=======================================================
        // Restore
        //=======================================================

        entity.IsDeleted =
            false;

        entity.DeletedDate =
            null;


        //=======================================================
        // Audit
        //=======================================================

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add
        (
            new ActivityHistory
            {
                Module =
                    "Infrastructure Control",

                EntityName =
                    "Menu Synchronization",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Menu Synchronization Restored",

                ActivityDescription =
                    $"'{entity.SynchronizationType}' synchronization configuration restored for '{entity.MenuName}'.",

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
}