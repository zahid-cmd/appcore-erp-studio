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
    // Normalize Physical Name
    //===========================================================
    //
    // Used ONLY for physical file/folder names.
    //
    // Allowed characters:
    //
    // Letters
    // Numbers
    // Hyphen (-)
    //
    // Spaces are converted to hyphens.
    //
    // All other technical/special characters are removed.
    //
    // Database/display names remain unchanged.
    //
    //===========================================================

    private static string NormalizePhysicalName
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(value)
        )
        {
            return string.Empty;
        }


        var normalized =
            new string
            (
                value
                    .Trim()
                    .Select
                    (
                        character =>
                        {
                            if
                            (
                                char.IsLetterOrDigit(character)
                            )
                            {
                                return character;
                            }


                            if
                            (
                                character ==
                                '-'
                            )
                            {
                                return '-';
                            }


                            if
                            (
                                char.IsWhiteSpace(character)
                            )
                            {
                                return '-';
                            }


                            return '\0';
                        }
                    )
                    .Where
                    (
                        character =>
                            character != '\0'
                    )
                    .ToArray()
            );


        while
        (
            normalized.Contains("--")
        )
        {
            normalized =
                normalized.Replace
                (
                    "--",
                    "-"
                );
        }


        return normalized.Trim('-');
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

                SubmenuId =
                    0,

                SubmenuCode =
                    string.Empty,

                SubmenuName =
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

                FrontendMenuFolder =
                    string.Empty,


                //===================================================
                // Frontend Submenu Location
                //===================================================

                FrontendSubmenuFolder =
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

            Directory.GetParent(solutionRoot) != null
        )
        {
            solutionRoot =
                Directory
                    .GetParent(solutionRoot)!
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
        // Physical Names
        //=======================================================

        var featureName =
            NormalizePhysicalName
            (
                module.Name
            );

        var menuName =
            NormalizePhysicalName
            (
                menu.Name
            );

        var submenuName =
            NormalizePhysicalName
            (
                submenu.Name
            );


        //=======================================================
        // Create Configuration
        //=======================================================

        var configuration =
            new SubmenuSynchronizationDto
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

                SubmenuId =
                    submenu.Id,

                SubmenuCode =
                    submenu.Code,

                SubmenuName =
                    submenu.Name,


                //===================================================
                // Synchronization
                //===================================================

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

            featureName,

            menuName,

            submenuName
        );


        //=======================================================
        // Completed
        //=======================================================

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
        //=======================================================
        // Frontend Solution
        //=======================================================

        configuration.FrontendSolution =
            frontendRoot;


        //=======================================================
        // Frontend Project
        //=======================================================

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
        // Existing Menu
        //=======================================================

        configuration.FrontendMenuFolder =
            Path.Combine
            (
                configuration.FrontendSourceFolder,
                featureName,
                menuName
            );


        //=======================================================
        // Existing Menu Pages
        //=======================================================

        var pagesFolder =
            Path.Combine
            (
                configuration.FrontendMenuFolder,
                "pages"
            );


        //=======================================================
        // Submenu
        //=======================================================

        configuration.FrontendSubmenuFolder =
            Path.Combine
            (
                pagesFolder,
                submenuName
            );


        //=======================================================
        // Form
        //=======================================================

        configuration.FrontendFormFolder =
            Path.Combine
            (
                configuration.FrontendSubmenuFolder,
                "form"
            );


        //=======================================================
        // List
        //=======================================================

        configuration.FrontendListFolder =
            Path.Combine
            (
                configuration.FrontendSubmenuFolder,
                "list"
            );


        //=======================================================
        // Submenu Model
        //=======================================================

        configuration.FrontendSubmenuModelFile =
            Path.Combine
            (
                configuration.FrontendMenuFolder,
                "models",
                $"{submenuName}.model.ts"
            );


        //=======================================================
        // Submenu Service
        //=======================================================

        configuration.FrontendSubmenuServiceFile =
            Path.Combine
            (
                configuration.FrontendMenuFolder,
                "services",
                $"{submenuName}.service.ts"
            );


        //=======================================================
        // Submenu Route
        //=======================================================

        configuration.FrontendSubmenuRouteFile =
            Path.Combine
            (
                configuration.FrontendMenuFolder,
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
        //=======================================================
        // Backend Solution
        //=======================================================

        configuration.BackendSolution =
            backendRoot;


        //=======================================================
        // Backend Projects
        //=======================================================

        configuration.BackendApplicationProject =
            "AppCore.Application";


        configuration.BackendDomainProject =
            "AppCore.Domain";


        configuration.BackendInfrastructureProject =
            "AppCore.Infrastructure";


        //=======================================================
        // API Controller
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
        // Application Submenu Folder
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


        //=======================================================
        // Application DTOs Folder
        //=======================================================

        configuration.BackendApplicationDtosFolder =
            Path.Combine
            (
                configuration.BackendApplicationSubMenuFolder,

                "DTOs"
            );


        //=======================================================
        // Application Interfaces Folder
        //=======================================================

        configuration.BackendApplicationInterfacesFolder =
            Path.Combine
            (
                configuration.BackendApplicationSubMenuFolder,

                "Interfaces"
            );


        //=======================================================
        // Submenu DTO
        //=======================================================

        configuration.BackendSubMenuDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"{submenuName}Dto.cs"
            );


        //=======================================================
        // Create Submenu DTO
        //=======================================================

        configuration.BackendCreateSubMenuDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"Create{submenuName}Dto.cs"
            );


        //=======================================================
        // Update Submenu DTO
        //=======================================================

        configuration.BackendUpdateSubMenuDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"Update{submenuName}Dto.cs"
            );


        //=======================================================
        // Submenu Defaults DTO
        //=======================================================

        configuration.BackendSubMenuDefaultsDtoFile =
            Path.Combine
            (
                configuration.BackendApplicationDtosFolder,

                $"{submenuName}DefaultsDto.cs"
            );


        //=======================================================
        // Submenu Repository Interface
        //=======================================================

        configuration.BackendSubMenuRepositoryInterfaceFile =
            Path.Combine
            (
                configuration.BackendApplicationInterfacesFolder,

                $"I{submenuName}Repository.cs"
            );


        //=======================================================
        // Domain Entity
        //=======================================================

        configuration.BackendSubMenuEntityFile =
            Path.Combine
            (
                backendRoot,

                "AppCore.Domain",

                moduleName,

                menuName,

                $"{submenuName}.cs"
            );


        //=======================================================
        // Infrastructure Configuration
        //=======================================================

        configuration.BackendSubMenuConfigurationFile =
            Path.Combine
            (
                backendRoot,

                "AppCore.Infrastructure",

                "Configurations",

                moduleName,

                menuName,

                $"{submenuName}Configuration.cs"
            );


        //=======================================================
        // Infrastructure Repository
        //=======================================================

        configuration.BackendSubMenuRepositoryFile =
            Path.Combine
            (
                backendRoot,

                "AppCore.Infrastructure",

                "Repositories",

                moduleName,

                menuName,

                $"{submenuName}Repository.cs"
            );
    }


    //===========================================================
    // Synchronize
    //===========================================================
    //
    // BUSINESS RULE:
    //
    // Module
    //     ↓
    // Menu
    //     ↓
    // Submenu
    //
    // A Submenu may only be synchronized when its immediate
    // parent Menu Synchronization has already completed
    // successfully.
    //
    // Saving / creating / analyzing a Menu Synchronization
    // configuration does NOT satisfy this requirement.
    //
    // Required parent state:
    //
    //     MenuSynchronization.Status == "Synchronized"
    //
    // Matching:
    //
    //     ModuleId
    //     MenuId
    //     SynchronizationType
    //
    //===========================================================

    public async Task<bool> SynchronizeAsync
    (
        long id
    )
    {
        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var synchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id == id

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
            throw new InvalidOperationException
            (
                "Submenu synchronization configuration was not found."
            );
        }


        //=======================================================
        // Validate Parent Menu Synchronization
        //=======================================================
        //
        // IMPORTANT:
        //
        // A Menu Synchronization record may exist in the database
        // while still being:
        //
        // Pending
        // Ready
        // Failed
        //
        // Such a record does NOT mean that the Menu has actually
        // been synchronized.
        //
        // Only Status = "Synchronized" is authoritative.
        //
        //=======================================================

        var parentMenuSynchronization =
            await _context.MenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        !x.IsDeleted

                        &&

                        x.ModuleId ==
                        synchronization.ModuleId

                        &&

                        x.MenuId ==
                        synchronization.MenuId

                        &&

                        x.SynchronizationType ==
                        synchronization.SynchronizationType
                );


        //=======================================================
        // Parent Menu Configuration Not Found
        //=======================================================

        if
        (
            parentMenuSynchronization == null
        )
        {
            throw new InvalidOperationException
            (
                $"The parent menu '{synchronization.MenuName}' has not been synchronized. Synchronize the parent menu before synchronizing the submenu."
            );
        }


        //=======================================================
        // Parent Menu Not Successfully Synchronized
        //=======================================================

        if
        (
            !string.Equals
            (
                parentMenuSynchronization.Status,

                "Synchronized",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException
            (
                $"The parent menu '{synchronization.MenuName}' is not successfully synchronized. Current status: '{parentMenuSynchronization.Status}'. Synchronize the parent menu successfully before synchronizing the submenu."
            );
        }


        //=======================================================
        // Execute Submenu Synchronization
        //=======================================================

        var result =
            await _submenuSynchronizationEngine
                .SynchronizeAsync
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
            await _submenuSynchronizationEngine
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
    // Exists By Submenu
    //===========================================================

    public async Task<bool> ExistsBySubmenuAsync
    (
        long submenuId,

        string synchronizationType,

        long? excludeId = null
    )
    {
        return await _context.SubmenuSynchronizations.AnyAsync
        (
            x =>

                !x.IsDeleted

                &&

                x.SubmenuId ==
                submenuId

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

                SubmenuId =
                    dto.SubmenuId,

                SubmenuCode =
                    dto.SubmenuCode,

                SubmenuName =
                    dto.SubmenuName,


                //===================================================
                // Synchronization Type
                //===================================================

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