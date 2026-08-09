//===============================================================
// Namespaces
//===============================================================

using System.IO;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.Interfaces;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization;


//===============================================================
// Submenu Synchronization Repository
//===============================================================

public class SubmenuSynchronizationRepository
    : ISubmenuSynchronizationRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _context;

    private readonly ISubmenuSynchronizationEngine
        _submenuSynchronizationEngine;


    //===========================================================
    // Constructor
    //===========================================================

    public SubmenuSynchronizationRepository
    (
        AppDbContext context,

        ISubmenuSynchronizationEngine
            submenuSynchronizationEngine
    )
    {
        _context =
            context;

        _submenuSynchronizationEngine =
            submenuSynchronizationEngine;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<SubmenuSynchronizationDefaultsDto> GetDefaultsAsync
    (
        string synchronizationType
    )
    {
        return await Task.FromResult
        (
            new SubmenuSynchronizationDefaultsDto
            {
                //===================================================
                // Navigation
                //===================================================

                ModuleId = 0,

                ModuleCode = string.Empty,

                ModuleName = string.Empty,

                MenuId = 0,

                MenuCode = string.Empty,

                MenuName = string.Empty,

                SubmenuId = 0,

                SubmenuCode = string.Empty,

                SubmenuName = string.Empty,


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

                FrontendMenuFolder =
                    string.Empty,


                //===================================================
                // Frontend Submenu Location
                //===================================================

                FrontendSubmenuFolder =
                    string.Empty,

                FrontendPagesFolder =
                    string.Empty,

                FrontendFormFolder =
                    string.Empty,

                FrontendListFolder =
                    string.Empty,


                //===================================================
                // Frontend Submenu Core Files
                //===================================================

                FrontendSubmenuModelFile =
                    string.Empty,

                FrontendSubmenuServiceFile =
                    string.Empty,

                FrontendSubmenuRouteFile =
                    string.Empty,


                //===================================================
                // Frontend Submenu Page Files
                //===================================================

                FrontendSubmenuFormTsFile =
                    string.Empty,

                FrontendSubmenuFormHtmlFile =
                    string.Empty,

                FrontendSubmenuFormCssFile =
                    string.Empty,

                FrontendSubmenuListTsFile =
                    string.Empty,

                FrontendSubmenuListHtmlFile =
                    string.Empty,

                FrontendSubmenuListCssFile =
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
                // Backend API
                //===================================================

                BackendControllerFile =
                    string.Empty,


                //===================================================
                // Backend Application
                //===================================================

                BackendApplicationSubMenuFolder =
                    string.Empty,

                BackendApplicationDtosFolder =
                    string.Empty,

                BackendApplicationInterfacesFolder =
                    string.Empty,

                BackendSubMenuDtoFile =
                    string.Empty,

                BackendCreateSubMenuDtoFile =
                    string.Empty,

                BackendUpdateSubMenuDtoFile =
                    string.Empty,

                BackendSubMenuDefaultsDtoFile =
                    string.Empty,

                BackendSubMenuRepositoryInterfaceFile =
                    string.Empty,


                //===================================================
                // Backend Domain
                //===================================================

                BackendSubMenuEntityFile =
                    string.Empty,


                //===================================================
                // Backend Infrastructure
                //===================================================

                BackendSubMenuConfigurationFile =
                    string.Empty,

                BackendSubMenuRepositoryFile =
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

    public async Task<List<SubmenuSynchronizationDto>> GetAllAsync
    (
        string synchronizationType
    )
    {
        return await _context.SubmenuSynchronizations

            .Where
            (
                x =>
                    !x.IsDeleted

                    &&

                    x.SynchronizationType ==
                    synchronizationType
            )

            .OrderBy
            (
                x => x.ModuleCode
            )

            .ThenBy
            (
                x => x.MenuCode
            )

            .ThenBy
            (
                x => x.SubmenuCode
            )

            .Select
            (
                x => new SubmenuSynchronizationDto
                {
                    Id =
                        x.Id,

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

                    SubmenuId =
                        x.SubmenuId,

                    SubmenuCode =
                        x.SubmenuCode,

                    SubmenuName =
                        x.SubmenuName,

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

                    FrontendMenuFolder =
                        x.FrontendMenuFolder,


                    //===================================================
                    // Frontend Submenu Location
                    //===================================================

                    FrontendSubmenuFolder =
                        x.FrontendSubmenuFolder,

                    FrontendPagesFolder =
                        x.FrontendPagesFolder,

                    FrontendFormFolder =
                        x.FrontendFormFolder,

                    FrontendListFolder =
                        x.FrontendListFolder,


                    //===================================================
                    // Frontend Submenu Core Files
                    //===================================================

                    FrontendSubmenuModelFile =
                        x.FrontendSubmenuModelFile,

                    FrontendSubmenuServiceFile =
                        x.FrontendSubmenuServiceFile,

                    FrontendSubmenuRouteFile =
                        x.FrontendSubmenuRouteFile,


                    //===================================================
                    // Frontend Submenu Page Files
                    //===================================================

                    FrontendSubmenuFormTsFile =
                        x.FrontendSubmenuFormTsFile,

                    FrontendSubmenuFormHtmlFile =
                        x.FrontendSubmenuFormHtmlFile,

                    FrontendSubmenuFormCssFile =
                        x.FrontendSubmenuFormCssFile,

                    FrontendSubmenuListTsFile =
                        x.FrontendSubmenuListTsFile,

                    FrontendSubmenuListHtmlFile =
                        x.FrontendSubmenuListHtmlFile,

                    FrontendSubmenuListCssFile =
                        x.FrontendSubmenuListCssFile,


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
                    // Backend API
                    //===================================================

                    BackendControllerFile =
                        x.BackendControllerFile,


                    //===================================================
                    // Backend Application
                    //===================================================

                    BackendApplicationSubMenuFolder =
                        x.BackendApplicationSubMenuFolder,

                    BackendApplicationDtosFolder =
                        x.BackendApplicationDtosFolder,

                    BackendApplicationInterfacesFolder =
                        x.BackendApplicationInterfacesFolder,

                    BackendSubMenuDtoFile =
                        x.BackendSubMenuDtoFile,

                    BackendCreateSubMenuDtoFile =
                        x.BackendCreateSubMenuDtoFile,

                    BackendUpdateSubMenuDtoFile =
                        x.BackendUpdateSubMenuDtoFile,

                    BackendSubMenuDefaultsDtoFile =
                        x.BackendSubMenuDefaultsDtoFile,

                    BackendSubMenuRepositoryInterfaceFile =
                        x.BackendSubMenuRepositoryInterfaceFile,


                    //===================================================
                    // Backend Domain
                    //===================================================

                    BackendSubMenuEntityFile =
                        x.BackendSubMenuEntityFile,


                    //===================================================
                    // Backend Infrastructure
                    //===================================================

                    BackendSubMenuConfigurationFile =
                        x.BackendSubMenuConfigurationFile,

                    BackendSubMenuRepositoryFile =
                        x.BackendSubMenuRepositoryFile,


                    //===================================================
                    // Synchronization
                    //===================================================

                    Status =
                        x.Status,

                    Remarks =
                        x.Remarks,

                    LastSynchronizedBy =
                        x.LastSynchronizedBy,

                    LastSynchronizedDate =
                        x.LastSynchronizedDate,

                    LastSynchronizationResult =
                        x.LastSynchronizationResult,

                    IsActive =
                        x.IsActive,

                    CreatedDate =
                        x.CreatedDate
                }
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<SubmenuSynchronizationDto?> GetByIdAsync
    (
        long id
    )
    {
        return await _context.SubmenuSynchronizations

            .Where
            (
                x =>

                    x.Id == id

                    &&

                    !x.IsDeleted
            )

            .Select
            (
                x => new SubmenuSynchronizationDto
                {
                    Id =
                        x.Id,

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

                    SubmenuId =
                        x.SubmenuId,

                    SubmenuCode =
                        x.SubmenuCode,

                    SubmenuName =
                        x.SubmenuName,

                    SynchronizationType =
                        x.SynchronizationType,

                    FrontendSolution =
                        x.FrontendSolution,

                    FrontendProject =
                        x.FrontendProject,

                    FrontendSourceFolder =
                        x.FrontendSourceFolder,

                    FrontendFeatureFolder =
                        x.FrontendFeatureFolder,

                    FrontendMenuFolder =
                        x.FrontendMenuFolder,

                    FrontendSubmenuFolder =
                        x.FrontendSubmenuFolder,

                    FrontendPagesFolder =
                        x.FrontendPagesFolder,

                    FrontendFormFolder =
                        x.FrontendFormFolder,

                    FrontendListFolder =
                        x.FrontendListFolder,

                    FrontendSubmenuModelFile =
                        x.FrontendSubmenuModelFile,

                    FrontendSubmenuServiceFile =
                        x.FrontendSubmenuServiceFile,

                    FrontendSubmenuRouteFile =
                        x.FrontendSubmenuRouteFile,

                    FrontendSubmenuFormTsFile =
                        x.FrontendSubmenuFormTsFile,

                    FrontendSubmenuFormHtmlFile =
                        x.FrontendSubmenuFormHtmlFile,

                    FrontendSubmenuFormCssFile =
                        x.FrontendSubmenuFormCssFile,

                    FrontendSubmenuListTsFile =
                        x.FrontendSubmenuListTsFile,

                    FrontendSubmenuListHtmlFile =
                        x.FrontendSubmenuListHtmlFile,

                    FrontendSubmenuListCssFile =
                        x.FrontendSubmenuListCssFile,

                    BackendSolution =
                        x.BackendSolution,

                    BackendApplicationProject =
                        x.BackendApplicationProject,

                    BackendDomainProject =
                        x.BackendDomainProject,

                    BackendInfrastructureProject =
                        x.BackendInfrastructureProject,

                    BackendControllerFile =
                        x.BackendControllerFile,

                    BackendApplicationSubMenuFolder =
                        x.BackendApplicationSubMenuFolder,

                    BackendApplicationDtosFolder =
                        x.BackendApplicationDtosFolder,

                    BackendApplicationInterfacesFolder =
                        x.BackendApplicationInterfacesFolder,

                    BackendSubMenuDtoFile =
                        x.BackendSubMenuDtoFile,

                    BackendCreateSubMenuDtoFile =
                        x.BackendCreateSubMenuDtoFile,

                    BackendUpdateSubMenuDtoFile =
                        x.BackendUpdateSubMenuDtoFile,

                    BackendSubMenuDefaultsDtoFile =
                        x.BackendSubMenuDefaultsDtoFile,

                    BackendSubMenuRepositoryInterfaceFile =
                        x.BackendSubMenuRepositoryInterfaceFile,

                    BackendSubMenuEntityFile =
                        x.BackendSubMenuEntityFile,

                    BackendSubMenuConfigurationFile =
                        x.BackendSubMenuConfigurationFile,

                    BackendSubMenuRepositoryFile =
                        x.BackendSubMenuRepositoryFile,

                    Status =
                        x.Status,

                    Remarks =
                        x.Remarks,

                    LastSynchronizedBy =
                        x.LastSynchronizedBy,

                    LastSynchronizedDate =
                        x.LastSynchronizedDate,

                    LastSynchronizationResult =
                        x.LastSynchronizationResult,

                    IsActive =
                        x.IsActive,

                    CreatedDate =
                        x.CreatedDate
                }
            )

            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Analyze
    //===========================================================

    public async Task<SubmenuSynchronizationDto> AnalyzeAsync
    (
        long moduleId,

        long menuId,

        long submenuId,

        string synchronizationType
    )
    {
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

            Directory.GetParent(solutionRoot) != null
        )
        {
            solutionRoot =
                Directory
                    .GetParent(solutionRoot)!
                    .FullName;
        }


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
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        !x.IsDeleted

                        &&

                        x.ModuleId == moduleId

                        &&

                        x.MenuId == menuId

                        &&

                        x.SubmenuId == submenuId

                        &&

                        x.SynchronizationType ==
                        synchronizationType
                );


        if
        (
            existing != null
        )
        {
            return await GetByIdAsync
            (
                existing.Id
            )
            ??
            new SubmenuSynchronizationDto();
        }


        //=======================================================
        // Load Module
        //=======================================================

        var module =
            await _context.NavigationModules

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id == moduleId

                        &&

                        !x.IsDeleted
                );

        if
        (
            module == null
        )
        {
            return new SubmenuSynchronizationDto();
        }


        //=======================================================
        // Load Menu
        //=======================================================

        var menu =
            await _context.NavigationMenus

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id == menuId

                        &&

                        !x.IsDeleted
                );

        if
        (
            menu == null
        )
        {
            return new SubmenuSynchronizationDto();
        }


        //=======================================================
        // Load Submenu
        //=======================================================

        var submenu =
            await _context.NavigationSubmenus

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id == submenuId

                        &&

                        !x.IsDeleted
                );

        if
        (
            submenu == null
        )
        {
            return new SubmenuSynchronizationDto();
        }


        //=======================================================
        // Build Names
        //=======================================================

        var featureName =
            module.Name
                .Trim()
                .Replace
                (
                    " ",
                    "-"
                )
                .ToLowerInvariant();

        var menuName =
            menu.Name
                .Trim()
                .Replace
                (
                    " ",
                    "-"
                )
                .ToLowerInvariant();

        var submenuName =
            submenu.Name
                .Trim()
                .Replace
                (
                    " ",
                    "-"
                )
                .ToLowerInvariant();


        //=======================================================
        // Create Configuration
        //=======================================================

        var configuration =
            new SubmenuSynchronizationDto
            {
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

                SubmenuId =
                    submenu.Id,

                SubmenuCode =
                    submenu.Code,

                SubmenuName =
                    submenu.Name,

                SynchronizationType =
                    synchronizationType,

                Status =
                    "Ready",

                Remarks =
                    string.Empty,

                IsActive =
                    submenu.IsActive
            };


        //=======================================================
        // Analyze Frontend
        //=======================================================

        AnalyzeFrontend
        (
            configuration,

            frontendRoot,

            featureName,

            menuName,

            submenuName
        );


        //=======================================================
        // Analyze Backend
        //=======================================================

        AnalyzeBackend
        (
            configuration,

            backendRoot,

            module.Name,

            menu.Name,

            submenu.Name
        );


        return configuration;
    }


    //===========================================================
    // Analyze Frontend
    //===========================================================

    private void AnalyzeFrontend
    (
        SubmenuSynchronizationDto configuration,

        string frontendRoot,

        string featureName,

        string menuName,

        string submenuName
    )
    {
        configuration.FrontendSolution =
            frontendRoot;


        configuration.FrontendProject =
            "Studio_UI";


        //=======================================================
        // Source
        //=======================================================

        configuration.FrontendSourceFolder =
            Path.Combine
            (
                frontendRoot,
                "src",
                "features"
            );


        //=======================================================
        // Feature
        //=======================================================

        configuration.FrontendFeatureFolder =
            featureName;


        //=======================================================
        // Menu
        //=======================================================

        configuration.FrontendMenuFolder =
            Path.Combine
            (
                configuration.FrontendSourceFolder,
                featureName,
                menuName
            );


        //=======================================================
        // Submenu
        //=======================================================

        configuration.FrontendSubmenuFolder =
            Path.Combine
            (
                configuration.FrontendMenuFolder,
                submenuName
            );


        //=======================================================
        // Pages
        //=======================================================

        configuration.FrontendPagesFolder =
            Path.Combine
            (
                configuration.FrontendSourceFolder,
                featureName,
                menuName,
                "pages",
                submenuName
            );


        //=======================================================
        // Form
        //=======================================================

        configuration.FrontendFormFolder =
            Path.Combine
            (
                configuration.FrontendPagesFolder,
                "form"
            );


        //=======================================================
        // List
        //=======================================================

        configuration.FrontendListFolder =
            Path.Combine
            (
                configuration.FrontendPagesFolder,
                "list"
            );


        //=======================================================
        // Submenu Model
        //=======================================================

        configuration.FrontendSubmenuModelFile =
            Path.Combine
            (
                configuration.FrontendSubmenuFolder,
                "models",
                $"{submenuName}.model.ts"
            );


        //=======================================================
        // Submenu Service
        //=======================================================

        configuration.FrontendSubmenuServiceFile =
            Path.Combine
            (
                configuration.FrontendSubmenuFolder,
                "services",
                $"{submenuName}.service.ts"
            );


        //=======================================================
        // Submenu Route
        //=======================================================

        configuration.FrontendSubmenuRouteFile =
            Path.Combine
            (
                configuration.FrontendSubmenuFolder,
                "routes",
                $"{submenuName}.routes.ts"
            );


        //=======================================================
        // Form Files
        //=======================================================

        configuration.FrontendSubmenuFormTsFile =
            Path.Combine
            (
                configuration.FrontendFormFolder,
                $"{submenuName}-form.ts"
            );


        configuration.FrontendSubmenuFormHtmlFile =
            Path.Combine
            (
                configuration.FrontendFormFolder,
                $"{submenuName}-form.html"
            );


        configuration.FrontendSubmenuFormCssFile =
            Path.Combine
            (
                configuration.FrontendFormFolder,
                $"{submenuName}-form.css"
            );


        //=======================================================
        // List Files
        //=======================================================

        configuration.FrontendSubmenuListTsFile =
            Path.Combine
            (
                configuration.FrontendListFolder,
                $"{submenuName}-list.ts"
            );


        configuration.FrontendSubmenuListHtmlFile =
            Path.Combine
            (
                configuration.FrontendListFolder,
                $"{submenuName}-list.html"
            );


        configuration.FrontendSubmenuListCssFile =
            Path.Combine
            (
                configuration.FrontendListFolder,
                $"{submenuName}-list.css"
            );
    }

    //===========================================================
    // Analyze Backend
    //===========================================================

    private void AnalyzeBackend
    (
        SubmenuSynchronizationDto configuration,

        string backendRoot,

        string moduleName,

        string menuName,

        string submenuName
    )
    {
        configuration.BackendSolution =
            backendRoot;


        configuration.BackendApplicationProject =
            "AppCore.Application";


        configuration.BackendDomainProject =
            "AppCore.Domain";


        configuration.BackendInfrastructureProject =
            "AppCore.Infrastructure";


        //=======================================================
        // Controller
        //=======================================================

        configuration.BackendControllerFile =
            Path.Combine
            (
                backendRoot,

                "AppCore.Api",

                "Controllers",

                moduleName,

                menuName,

                $"{submenuName}Controller.cs"
            );


        //=======================================================
        // Application
        //=======================================================

        configuration.BackendApplicationSubMenuFolder =
            Path.Combine
            (
                backendRoot,

                "AppCore.Application",

                moduleName,

                menuName,

                submenuName
            );


        configuration.BackendApplicationDtosFolder =
            Path.Combine
            (
                configuration.BackendApplicationSubMenuFolder,

                "DTOs"
            );


        configuration.BackendApplicationInterfacesFolder =
            Path.Combine
            (
                configuration.BackendApplicationSubMenuFolder,

                "Interfaces"
            );


        configuration.BackendSubMenuDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"{submenuName}Dto.cs"
            );


        configuration.BackendCreateSubMenuDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"Create{submenuName}Dto.cs"
            );


        configuration.BackendUpdateSubMenuDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"Update{submenuName}Dto.cs"
            );


        configuration.BackendSubMenuDefaultsDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"{submenuName}DefaultsDto.cs"
            );


        configuration.BackendSubMenuRepositoryInterfaceFile =
            Path.Combine
            (
                configuration.BackendApplicationInterfacesFolder,

                $"I{submenuName}Repository.cs"
            );


        //=======================================================
        // Domain
        //=======================================================
        // Corrected structure:
        //
        // AppCore.Domain
        //     Settings
        //         General Settings
        //             Company
        //                 Company.cs
        //=======================================================

        configuration.BackendSubMenuEntityFile =
            Path.Combine
            (
                backendRoot,

                "AppCore.Domain",

                moduleName,

                menuName,

                submenuName,

                $"{submenuName}.cs"
            );


        //=======================================================
        // Infrastructure Configuration
        //=======================================================
        // Corrected structure:
        //
        // AppCore.Infrastructure
        //     Configurations
        //         Settings
        //             General Settings
        //                 Company
        //                     CompanyConfiguration.cs
        //=======================================================

        configuration.BackendSubMenuConfigurationFile =
            Path.Combine
            (
                backendRoot,

                "AppCore.Infrastructure",

                "Configurations",

                moduleName,

                menuName,

                submenuName,

                $"{submenuName}Configuration.cs"
            );


        //=======================================================
        // Infrastructure Repository
        //=======================================================
        // Corrected structure:
        //
        // AppCore.Infrastructure
        //     Repositories
        //         Settings
        //             General Settings
        //                 Company
        //                     CompanyRepository.cs
        //=======================================================

        configuration.BackendSubMenuRepositoryFile =
            Path.Combine
            (
                backendRoot,

                "AppCore.Infrastructure",

                "Repositories",

                moduleName,

                menuName,

                submenuName,

                $"{submenuName}Repository.cs"
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
        var result =
            await _submenuSynchronizationEngine
                .SynchronizeAsync
                (
                    id
                );

        return result.Success;
    }


    //===========================================================
    // Rollback
    //===========================================================

    public async Task<bool> RollbackAsync
    (
        long id
    )
    {
        var result =
            await _submenuSynchronizationEngine
                .RollbackAsync
                (
                    id
                );

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

        return true;
    }


    //===========================================================
    // Exists By Submenu
    //===========================================================

    public async Task<bool> ExistsBySubmenuAsync
    (
        long submenuId,

        string synchronizationType,

        long? excludeId = null
    )
    {
        return await _context.SubmenuSynchronizations.AnyAsync(x =>

            !x.IsDeleted

            &&

            x.SubmenuId == submenuId

            &&

            x.SynchronizationType ==
            synchronizationType

            &&

            (
                !excludeId.HasValue

                ||

                x.Id != excludeId.Value
            ));
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync
    (
        CreateSubmenuSynchronizationDto dto
    )
    {
        const long userId = 1;


        //=======================================================
        // Duplicate Check
        //=======================================================

        var exists =
            await ExistsBySubmenuAsync
            (
                dto.SubmenuId,

                dto.SynchronizationType
            );

        if
        (
            exists
        )
        {
            throw new InvalidOperationException
            (
                $"A {dto.SynchronizationType} synchronization already exists for '{dto.SubmenuName}'."
            );
        }


        //=======================================================
        // Create Entity
        //=======================================================

        var synchronization =
            new AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization
            {
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

                SubmenuId =
                    dto.SubmenuId,

                SubmenuCode =
                    dto.SubmenuCode,

                SubmenuName =
                    dto.SubmenuName,

                SynchronizationType =
                    dto.SynchronizationType,


                //===================================================
                // Frontend
                //===================================================

                FrontendSolution =
                    dto.FrontendSolution,

                FrontendProject =
                    dto.FrontendProject,

                FrontendSourceFolder =
                    dto.FrontendSourceFolder,

                FrontendFeatureFolder =
                    dto.FrontendFeatureFolder,

                FrontendMenuFolder =
                    dto.FrontendMenuFolder,

                FrontendSubmenuFolder =
                    dto.FrontendSubmenuFolder,

                FrontendPagesFolder =
                    dto.FrontendPagesFolder,

                FrontendFormFolder =
                    dto.FrontendFormFolder,

                FrontendListFolder =
                    dto.FrontendListFolder,

                FrontendSubmenuModelFile =
                    dto.FrontendSubmenuModelFile,

                FrontendSubmenuServiceFile =
                    dto.FrontendSubmenuServiceFile,

                FrontendSubmenuRouteFile =
                    dto.FrontendSubmenuRouteFile,

                FrontendSubmenuFormTsFile =
                    dto.FrontendSubmenuFormTsFile,

                FrontendSubmenuFormHtmlFile =
                    dto.FrontendSubmenuFormHtmlFile,

                FrontendSubmenuFormCssFile =
                    dto.FrontendSubmenuFormCssFile,

                FrontendSubmenuListTsFile =
                    dto.FrontendSubmenuListTsFile,

                FrontendSubmenuListHtmlFile =
                    dto.FrontendSubmenuListHtmlFile,

                FrontendSubmenuListCssFile =
                    dto.FrontendSubmenuListCssFile,


                //===================================================
                // Backend
                //===================================================

                BackendSolution =
                    dto.BackendSolution,

                BackendApplicationProject =
                    dto.BackendApplicationProject,

                BackendDomainProject =
                    dto.BackendDomainProject,

                BackendInfrastructureProject =
                    dto.BackendInfrastructureProject,

                BackendControllerFile =
                    dto.BackendControllerFile,

                BackendApplicationSubMenuFolder =
                    dto.BackendApplicationSubMenuFolder,

                BackendApplicationDtosFolder =
                    dto.BackendApplicationDtosFolder,

                BackendApplicationInterfacesFolder =
                    dto.BackendApplicationInterfacesFolder,

                BackendSubMenuDtoFile =
                    dto.BackendSubMenuDtoFile,

                BackendCreateSubMenuDtoFile =
                    dto.BackendCreateSubMenuDtoFile,

                BackendUpdateSubMenuDtoFile =
                    dto.BackendUpdateSubMenuDtoFile,

                BackendSubMenuDefaultsDtoFile =
                    dto.BackendSubMenuDefaultsDtoFile,

                BackendSubMenuRepositoryInterfaceFile =
                    dto.BackendSubMenuRepositoryInterfaceFile,

                BackendSubMenuEntityFile =
                    dto.BackendSubMenuEntityFile,

                BackendSubMenuConfigurationFile =
                    dto.BackendSubMenuConfigurationFile,

                BackendSubMenuRepositoryFile =
                    dto.BackendSubMenuRepositoryFile,


                //===================================================
                // Synchronization
                //===================================================

                Status =
                    dto.Status,

                Remarks =
                    dto.Remarks,

                LastSynchronizedBy =
                    dto.LastSynchronizedBy,

                LastSynchronizedDate =
                    dto.LastSynchronizedDate,

                LastSynchronizationResult =
                    dto.LastSynchronizationResult,

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


        _context.SubmenuSynchronizations.Add
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
                    "Submenu Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Submenu Synchronization Created",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration created for '{synchronization.SubmenuName}'.",

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
        UpdateSubmenuSynchronizationDto dto
    )
    {
        const long userId = 1;


        //=======================================================
        // Duplicate Check
        //=======================================================

        var exists =
            await ExistsBySubmenuAsync
            (
                dto.SubmenuId,

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
                $"A {dto.SynchronizationType} synchronization already exists for '{dto.SubmenuName}'."
            );
        }


        //=======================================================
        // Load Entity
        //=======================================================

        var synchronization =
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id == dto.Id

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

        synchronization.SubmenuId =
            dto.SubmenuId;

        synchronization.SubmenuCode =
            dto.SubmenuCode;

        synchronization.SubmenuName =
            dto.SubmenuName;


        //=======================================================
        // Synchronization Type
        //=======================================================

        synchronization.SynchronizationType =
            dto.SynchronizationType;


        //=======================================================
        // Frontend
        //=======================================================

        synchronization.FrontendSolution =
            dto.FrontendSolution;

        synchronization.FrontendProject =
            dto.FrontendProject;

        synchronization.FrontendSourceFolder =
            dto.FrontendSourceFolder;

        synchronization.FrontendFeatureFolder =
            dto.FrontendFeatureFolder;

        synchronization.FrontendMenuFolder =
            dto.FrontendMenuFolder;

        synchronization.FrontendSubmenuFolder =
            dto.FrontendSubmenuFolder;

        synchronization.FrontendPagesFolder =
            dto.FrontendPagesFolder;

        synchronization.FrontendFormFolder =
            dto.FrontendFormFolder;

        synchronization.FrontendListFolder =
            dto.FrontendListFolder;

        synchronization.FrontendSubmenuModelFile =
            dto.FrontendSubmenuModelFile;

        synchronization.FrontendSubmenuServiceFile =
            dto.FrontendSubmenuServiceFile;

        synchronization.FrontendSubmenuRouteFile =
            dto.FrontendSubmenuRouteFile;

        synchronization.FrontendSubmenuFormTsFile =
            dto.FrontendSubmenuFormTsFile;

        synchronization.FrontendSubmenuFormHtmlFile =
            dto.FrontendSubmenuFormHtmlFile;

        synchronization.FrontendSubmenuFormCssFile =
            dto.FrontendSubmenuFormCssFile;

        synchronization.FrontendSubmenuListTsFile =
            dto.FrontendSubmenuListTsFile;

        synchronization.FrontendSubmenuListHtmlFile =
            dto.FrontendSubmenuListHtmlFile;

        synchronization.FrontendSubmenuListCssFile =
            dto.FrontendSubmenuListCssFile;


        //=======================================================
        // Backend
        //=======================================================

        synchronization.BackendSolution =
            dto.BackendSolution;

        synchronization.BackendApplicationProject =
            dto.BackendApplicationProject;

        synchronization.BackendDomainProject =
            dto.BackendDomainProject;

        synchronization.BackendInfrastructureProject =
            dto.BackendInfrastructureProject;

        synchronization.BackendControllerFile =
            dto.BackendControllerFile;

        synchronization.BackendApplicationSubMenuFolder =
            dto.BackendApplicationSubMenuFolder;

        synchronization.BackendApplicationDtosFolder =
            dto.BackendApplicationDtosFolder;

        synchronization.BackendApplicationInterfacesFolder =
            dto.BackendApplicationInterfacesFolder;

        synchronization.BackendSubMenuDtoFile =
            dto.BackendSubMenuDtoFile;

        synchronization.BackendCreateSubMenuDtoFile =
            dto.BackendCreateSubMenuDtoFile;

        synchronization.BackendUpdateSubMenuDtoFile =
            dto.BackendUpdateSubMenuDtoFile;

        synchronization.BackendSubMenuDefaultsDtoFile =
            dto.BackendSubMenuDefaultsDtoFile;

        synchronization.BackendSubMenuRepositoryInterfaceFile =
            dto.BackendSubMenuRepositoryInterfaceFile;

        synchronization.BackendSubMenuEntityFile =
            dto.BackendSubMenuEntityFile;

        synchronization.BackendSubMenuConfigurationFile =
            dto.BackendSubMenuConfigurationFile;

        synchronization.BackendSubMenuRepositoryFile =
            dto.BackendSubMenuRepositoryFile;


        //=======================================================
        // Synchronization
        //=======================================================

        synchronization.Status =
            dto.Status;

        synchronization.Remarks =
            dto.Remarks;

        synchronization.LastSynchronizedBy =
            dto.LastSynchronizedBy;

        synchronization.LastSynchronizedDate =
            dto.LastSynchronizedDate;

        synchronization.LastSynchronizationResult =
            dto.LastSynchronizationResult;

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
                    "Submenu Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Submenu Synchronization Updated",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration updated for '{synchronization.SubmenuName}'.",

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
        const long userId = 1;


        var synchronization =
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id == id

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
                    "Submenu Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Submenu Synchronization Deleted",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration deleted for '{synchronization.SubmenuName}'.",

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
        const long userId = 1;


        //=======================================================
        // Load Deleted Entity
        //=======================================================

        var entity =
            await _context.SubmenuSynchronizations

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
                    x => x.DeletedDate
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
                    "Submenu Synchronization",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Submenu Synchronization Restored",

                ActivityDescription =
                    $"'{entity.SynchronizationType}' synchronization configuration restored for '{entity.SubmenuName}'.",

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