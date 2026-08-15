//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Text;

using System.Threading.Tasks;

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
    // Normalize Frontend Physical Name
    //===========================================================
    //
    // Used ONLY for frontend physical file/folder names.
    //
    // Database/display names remain unchanged.
    //
    // Frontend physical naming rule:
    //
    // - lowercase only
    // - words separated by hyphens
    // - spaces become hyphens
    // - special/technical characters become separators
    // - repeated hyphens are removed
    //
    // Examples:
    //
    // General Settings
    //     -> general-settings
    //
    // Account & Finance
    //     -> account-finance
    //
    // Human Resource Management
    //     -> human-resource-management
    //
    // Company
    //     -> company
    //
    //===========================================================

    private static string NormalizeFrontendPhysicalName
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


        var builder =
            new StringBuilder();


        var previousWasSeparator =
            false;


        foreach
        (
            var character in value.Trim()
        )
        {
            if
            (
                char.IsLetterOrDigit(character)
            )
            {
                builder.Append
                (
                    char.ToLowerInvariant
                    (
                        character
                    )
                );


                previousWasSeparator =
                    false;


                continue;
            }


            if
            (
                builder.Length > 0
                &&
                !previousWasSeparator
            )
            {
                builder.Append
                (
                    '-'
                );


                previousWasSeparator =
                    true;
            }
        }


        return builder
            .ToString()
            .Trim
            (
                '-'
            );
    }



    //===========================================================
    // Normalize Backend Physical Name
    //===========================================================
    //
    // Used ONLY for backend physical file/folder names.
    //
    // Database/display names remain unchanged.
    //
    // Backend naming rule:
    //
    // Letters
    // Numbers
    //
    // Spaces and technical/special characters are removed.
    //
    // Examples:
    //
    // General Settings
    //     -> GeneralSettings
    //
    // Account & Finance
    //     -> AccountFinance
    //
    //===========================================================

    private static string NormalizeBackendPhysicalName
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

                FrontendMenuRouteFile =
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

                    FrontendMenuRouteFile =
                        x.FrontendMenuRouteFile,


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

                    FrontendMenuRouteFile =
                        x.FrontendMenuRouteFile,

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
        // Frontend Physical Names
        //=======================================================
        //
        // Frontend physical names are ALWAYS lowercase kebab-case.
        //
        // Examples:
        //
        // Settings
        //     -> settings
        //
        // General Settings
        //     -> general-settings
        //
        // Company
        //     -> company
        //
        //=======================================================

        var frontendFeatureName =
            NormalizeFrontendPhysicalName
            (
                module.Name
            );


        var frontendMenuName =
            NormalizeFrontendPhysicalName
            (
                menu.Name
            );


        var frontendSubmenuName =
            NormalizeFrontendPhysicalName
            (
                submenu.Name
            );



        //=======================================================
        // Backend Physical Names
        //=======================================================
        //
        // Backend names remain PascalCase because they are used
        // for C# namespaces, classes, controllers and repositories.
        //
        //=======================================================

        var backendModuleName =
            NormalizeBackendPhysicalName
            (
                module.Name
            );


        var backendMenuName =
            NormalizeBackendPhysicalName
            (
                menu.Name
            );


        var backendSubmenuName =
            NormalizeBackendPhysicalName
            (
                submenu.Name
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
            var existingConfiguration =
                await GetByIdAsync
                (
                    existing.Id
                );


            if
            (
                existingConfiguration == null
            )
            {
                return new SubmenuSynchronizationDto();
            }


            AnalyzeFrontend
            (
                existingConfiguration,

                frontendRoot,

                frontendFeatureName,

                frontendMenuName,

                frontendSubmenuName
            );


            AnalyzeBackend
            (
                existingConfiguration,

                backendRoot,

                backendModuleName,

                backendMenuName,

                backendSubmenuName
            );


            await UpdateExistingConfigurationPathsAsync
            (
                existing,

                existingConfiguration
            );


            return existingConfiguration;
        }



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

            frontendFeatureName,

            frontendMenuName,

            frontendSubmenuName
        );



        //=======================================================
        // Analyze Backend
        //=======================================================

        AnalyzeBackend
        (
            configuration,

            backendRoot,

            backendModuleName,

            backendMenuName,

            backendSubmenuName
        );



        //=======================================================
        // Completed
        //=======================================================

        return configuration;
    }



    //===========================================================
    // Update Existing Configuration Paths
    //===========================================================

    private async Task UpdateExistingConfigurationPathsAsync
    (
        AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization entity,

        SubmenuSynchronizationDto configuration
    )
    {
        var changed =
            false;


        //=======================================================
        // Frontend Paths
        //=======================================================

        if
        (
            entity.FrontendSolution !=
            configuration.FrontendSolution
        )
        {
            entity.FrontendSolution =
                configuration.FrontendSolution;

            changed =
                true;
        }


        if
        (
            entity.FrontendProject !=
            configuration.FrontendProject
        )
        {
            entity.FrontendProject =
                configuration.FrontendProject;

            changed =
                true;
        }


        if
        (
            entity.FrontendSourceFolder !=
            configuration.FrontendSourceFolder
        )
        {
            entity.FrontendSourceFolder =
                configuration.FrontendSourceFolder;

            changed =
                true;
        }


        if
        (
            entity.FrontendFeatureFolder !=
            configuration.FrontendFeatureFolder
        )
        {
            entity.FrontendFeatureFolder =
                configuration.FrontendFeatureFolder;

            changed =
                true;
        }


        if
        (
            entity.FrontendMenuFolder !=
            configuration.FrontendMenuFolder
        )
        {
            entity.FrontendMenuFolder =
                configuration.FrontendMenuFolder;

            changed =
                true;
        }


        if
        (
            entity.FrontendMenuRouteFile !=
            configuration.FrontendMenuRouteFile
        )
        {
            entity.FrontendMenuRouteFile =
                configuration.FrontendMenuRouteFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuFolder !=
            configuration.FrontendSubmenuFolder
        )
        {
            entity.FrontendSubmenuFolder =
                configuration.FrontendSubmenuFolder;

            changed =
                true;
        }


        if
        (
            entity.FrontendFormFolder !=
            configuration.FrontendFormFolder
        )
        {
            entity.FrontendFormFolder =
                configuration.FrontendFormFolder;

            changed =
                true;
        }


        if
        (
            entity.FrontendListFolder !=
            configuration.FrontendListFolder
        )
        {
            entity.FrontendListFolder =
                configuration.FrontendListFolder;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuModelFile !=
            configuration.FrontendSubmenuModelFile
        )
        {
            entity.FrontendSubmenuModelFile =
                configuration.FrontendSubmenuModelFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuServiceFile !=
            configuration.FrontendSubmenuServiceFile
        )
        {
            entity.FrontendSubmenuServiceFile =
                configuration.FrontendSubmenuServiceFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuRouteFile !=
            configuration.FrontendSubmenuRouteFile
        )
        {
            entity.FrontendSubmenuRouteFile =
                configuration.FrontendSubmenuRouteFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuFormTsFile !=
            configuration.FrontendSubmenuFormTsFile
        )
        {
            entity.FrontendSubmenuFormTsFile =
                configuration.FrontendSubmenuFormTsFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuFormHtmlFile !=
            configuration.FrontendSubmenuFormHtmlFile
        )
        {
            entity.FrontendSubmenuFormHtmlFile =
                configuration.FrontendSubmenuFormHtmlFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuFormCssFile !=
            configuration.FrontendSubmenuFormCssFile
        )
        {
            entity.FrontendSubmenuFormCssFile =
                configuration.FrontendSubmenuFormCssFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuListTsFile !=
            configuration.FrontendSubmenuListTsFile
        )
        {
            entity.FrontendSubmenuListTsFile =
                configuration.FrontendSubmenuListTsFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuListHtmlFile !=
            configuration.FrontendSubmenuListHtmlFile
        )
        {
            entity.FrontendSubmenuListHtmlFile =
                configuration.FrontendSubmenuListHtmlFile;

            changed =
                true;
        }


        if
        (
            entity.FrontendSubmenuListCssFile !=
            configuration.FrontendSubmenuListCssFile
        )
        {
            entity.FrontendSubmenuListCssFile =
                configuration.FrontendSubmenuListCssFile;

            changed =
                true;
        }



        //=======================================================
        // Backend Paths
        //=======================================================

        if
        (
            entity.BackendSolution !=
            configuration.BackendSolution
        )
        {
            entity.BackendSolution =
                configuration.BackendSolution;

            changed =
                true;
        }


        if
        (
            entity.BackendApplicationProject !=
            configuration.BackendApplicationProject
        )
        {
            entity.BackendApplicationProject =
                configuration.BackendApplicationProject;

            changed =
                true;
        }


        if
        (
            entity.BackendDomainProject !=
            configuration.BackendDomainProject
        )
        {
            entity.BackendDomainProject =
                configuration.BackendDomainProject;

            changed =
                true;
        }


        if
        (
            entity.BackendInfrastructureProject !=
            configuration.BackendInfrastructureProject
        )
        {
            entity.BackendInfrastructureProject =
                configuration.BackendInfrastructureProject;

            changed =
                true;
        }


        if
        (
            entity.BackendControllerFile !=
            configuration.BackendControllerFile
        )
        {
            entity.BackendControllerFile =
                configuration.BackendControllerFile;

            changed =
                true;
        }


        if
        (
            entity.BackendApplicationSubMenuFolder !=
            configuration.BackendApplicationSubMenuFolder
        )
        {
            entity.BackendApplicationSubMenuFolder =
                configuration.BackendApplicationSubMenuFolder;

            changed =
                true;
        }


        if
        (
            entity.BackendApplicationDtosFolder !=
            configuration.BackendApplicationDtosFolder
        )
        {
            entity.BackendApplicationDtosFolder =
                configuration.BackendApplicationDtosFolder;

            changed =
                true;
        }


        if
        (
            entity.BackendApplicationInterfacesFolder !=
            configuration.BackendApplicationInterfacesFolder
        )
        {
            entity.BackendApplicationInterfacesFolder =
                configuration.BackendApplicationInterfacesFolder;

            changed =
                true;
        }


        if
        (
            entity.BackendSubMenuDtoFile !=
            configuration.BackendSubMenuDtoFile
        )
        {
            entity.BackendSubMenuDtoFile =
                configuration.BackendSubMenuDtoFile;

            changed =
                true;
        }


        if
        (
            entity.BackendCreateSubMenuDtoFile !=
            configuration.BackendCreateSubMenuDtoFile
        )
        {
            entity.BackendCreateSubMenuDtoFile =
                configuration.BackendCreateSubMenuDtoFile;

            changed =
                true;
        }


        if
        (
            entity.BackendUpdateSubMenuDtoFile !=
            configuration.BackendUpdateSubMenuDtoFile
        )
        {
            entity.BackendUpdateSubMenuDtoFile =
                configuration.BackendUpdateSubMenuDtoFile;

            changed =
                true;
        }


        if
        (
            entity.BackendSubMenuDefaultsDtoFile !=
            configuration.BackendSubMenuDefaultsDtoFile
        )
        {
            entity.BackendSubMenuDefaultsDtoFile =
                configuration.BackendSubMenuDefaultsDtoFile;

            changed =
                true;
        }


        if
        (
            entity.BackendSubMenuRepositoryInterfaceFile !=
            configuration.BackendSubMenuRepositoryInterfaceFile
        )
        {
            entity.BackendSubMenuRepositoryInterfaceFile =
                configuration.BackendSubMenuRepositoryInterfaceFile;

            changed =
                true;
        }


        if
        (
            entity.BackendSubMenuEntityFile !=
            configuration.BackendSubMenuEntityFile
        )
        {
            entity.BackendSubMenuEntityFile =
                configuration.BackendSubMenuEntityFile;

            changed =
                true;
        }


        if
        (
            entity.BackendSubMenuConfigurationFile !=
            configuration.BackendSubMenuConfigurationFile
        )
        {
            entity.BackendSubMenuConfigurationFile =
                configuration.BackendSubMenuConfigurationFile;

            changed =
                true;
        }


        if
        (
            entity.BackendSubMenuRepositoryFile !=
            configuration.BackendSubMenuRepositoryFile
        )
        {
            entity.BackendSubMenuRepositoryFile =
                configuration.BackendSubMenuRepositoryFile;

            changed =
                true;
        }


        if
        (
            changed
        )
        {
            entity.ModifiedDate =
                DateTime.UtcNow;

            entity.ModifiedBy =
                1;


            await _context.SaveChangesAsync();
        }
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
        // Existing Menu Route File
        //=======================================================

        configuration.FrontendMenuRouteFile =
            Path.Combine
            (
                configuration.FrontendMenuFolder,
                "routes",
                $"{menuName}.routes.ts"
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

                FrontendMenuRouteFile =
                    dto.FrontendMenuRouteFile,

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

        synchronization.FrontendMenuRouteFile =
            dto.FrontendMenuRouteFile;

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