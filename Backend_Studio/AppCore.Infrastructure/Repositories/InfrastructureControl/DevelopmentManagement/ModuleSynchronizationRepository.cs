//===============================================================
// Namespaces
//===============================================================

using System.IO;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.Interfaces;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Module Synchronization Repository
//===============================================================

public class ModuleSynchronizationRepository
    : IModuleSynchronizationRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _context;

    private readonly IModuleSynchronizationEngine
        _moduleSynchronizationEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public ModuleSynchronizationRepository
    (
        AppDbContext context,

        IModuleSynchronizationEngine
            moduleSynchronizationEngine
    )
    {
        _context =
            context;

        _moduleSynchronizationEngine =
            moduleSynchronizationEngine;
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ModuleSynchronizationDefaultsDto> GetDefaultsAsync
    (
        string synchronizationType
    )
    {
        return await Task.FromResult(
            new ModuleSynchronizationDefaultsDto
            {
                //===================================================
                // Navigation
                //===================================================

                ModuleId = 0,

                ModuleCode = string.Empty,

                ModuleName = string.Empty,


                //===================================================
                // Synchronization Type
                //===================================================

                SynchronizationType = synchronizationType,


                //===================================================
                // Frontend Target Location
                //===================================================

                FrontendSolution = string.Empty,

                FrontendProject = string.Empty,

                FrontendSourceFolder = string.Empty,

                FrontendFeatureFolder = string.Empty,


                //===================================================
                // Frontend Standard Module Structure
                //===================================================

                FrontendModuleFolder = string.Empty,

                FrontendRoutesFolder = string.Empty,


                //===================================================
                // Frontend Application Registration
                //===================================================

                FrontendModuleRouteFile = string.Empty,

                FrontendApplicationRouteFile = string.Empty,


                //===================================================
                // Backend Target Location
                //===================================================

                BackendSolution = string.Empty,

                BackendApiProject = string.Empty,

                BackendApplicationProject = string.Empty,

                BackendDomainProject = string.Empty,

                BackendInfrastructureProject = string.Empty,


                //===================================================
                // Backend Standard Module Structure
                //===================================================

                BackendControllerFolder = string.Empty,

                BackendApplicationFolder = string.Empty,

                BackendInterfaceFolder = string.Empty,

                BackendEntityFolder = string.Empty,

                BackendRepositoryFolder = string.Empty,

                BackendConfigurationFolder = string.Empty,


                //===================================================
                // Backend Application Registration
                //===================================================

                DependencyInjectionFile = string.Empty,

                DbContextFile = string.Empty,


                //===================================================
                // Synchronization
                //===================================================

                Status = "Pending",


                //===================================================
                // Status
                //===================================================

                IsActive = true
            });
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<ModuleSynchronizationDto>> GetAllAsync
    (
        string synchronizationType
    )
    {
        return await _context.ModuleSynchronizations

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

            .Select
            (
                x => new ModuleSynchronizationDto
                {
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
                    // Frontend Standard Module Structure
                    //===================================================

                    FrontendModuleFolder =
                        x.FrontendModuleFolder,

                    FrontendRoutesFolder =
                        x.FrontendRoutesFolder,


                    //===================================================
                    // Frontend Application Registration
                    //===================================================

                    FrontendModuleRouteFile =
                        x.FrontendModuleRouteFile,

                    FrontendApplicationRouteFile =
                        x.FrontendApplicationRouteFile,


                    //===================================================
                    // Backend Target Location
                    //===================================================

                    BackendSolution =
                        x.BackendSolution,

                    BackendApiProject =
                        x.BackendApiProject,

                    BackendApplicationProject =
                        x.BackendApplicationProject,

                    BackendDomainProject =
                        x.BackendDomainProject,

                    BackendInfrastructureProject =
                        x.BackendInfrastructureProject,


                    //===================================================
                    // Backend Standard Module Structure
                    //===================================================

                    BackendControllerFolder =
                        x.BackendControllerFolder,

                    BackendApplicationFolder =
                        x.BackendApplicationFolder,

                    BackendInterfaceFolder =
                        x.BackendInterfaceFolder,

                    BackendEntityFolder =
                        x.BackendEntityFolder,

                    BackendRepositoryFolder =
                        x.BackendRepositoryFolder,

                    BackendConfigurationFolder =
                        x.BackendConfigurationFolder,


                    //===================================================
                    // Backend Application Registration
                    //===================================================

                    DependencyInjectionFile =
                        x.DependencyInjectionFile,

                    DbContextFile =
                        x.DbContextFile,


                    //===================================================
                    // Synchronization
                    //===================================================

                    Status =
                        x.Status,


                    //===================================================
                    // Audit
                    //===================================================

                    CreatedDate =
                        x.CreatedDate,


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
                        x.IsActive
                }
            )

            .ToListAsync();
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ModuleSynchronizationDto?> GetByIdAsync
    (
        long id
    )
    {
        return await _context.ModuleSynchronizations

            .Where
            (
                x =>

                    x.Id == id

                    &&

                    !x.IsDeleted
            )

            .Select
            (
                x => new ModuleSynchronizationDto
                {
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
                    // Frontend Standard Module Structure
                    //===================================================

                    FrontendModuleFolder =
                        x.FrontendModuleFolder,

                    FrontendRoutesFolder =
                        x.FrontendRoutesFolder,


                    //===================================================
                    // Frontend Application Registration
                    //===================================================

                    FrontendModuleRouteFile =
                        x.FrontendModuleRouteFile,

                    FrontendApplicationRouteFile =
                        x.FrontendApplicationRouteFile,


                    //===================================================
                    // Backend Target Location
                    //===================================================

                    BackendSolution =
                        x.BackendSolution,

                    BackendApiProject =
                        x.BackendApiProject,

                    BackendApplicationProject =
                        x.BackendApplicationProject,

                    BackendDomainProject =
                        x.BackendDomainProject,

                    BackendInfrastructureProject =
                        x.BackendInfrastructureProject,


                    //===================================================
                    // Backend Standard Module Structure
                    //===================================================

                    BackendControllerFolder =
                        x.BackendControllerFolder,

                    BackendApplicationFolder =
                        x.BackendApplicationFolder,

                    BackendInterfaceFolder =
                        x.BackendInterfaceFolder,

                    BackendEntityFolder =
                        x.BackendEntityFolder,

                    BackendRepositoryFolder =
                        x.BackendRepositoryFolder,

                    BackendConfigurationFolder =
                        x.BackendConfigurationFolder,


                    //===================================================
                    // Backend Application Registration
                    //===================================================

                    DependencyInjectionFile =
                        x.DependencyInjectionFile,

                    DbContextFile =
                        x.DbContextFile,


                    //===================================================
                    // Synchronization
                    //===================================================

                    Status =
                        x.Status,


                    //===================================================
                    // Audit
                    //===================================================

                    CreatedDate =
                        x.CreatedDate,


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
                        x.IsActive
                }
            )

            .FirstOrDefaultAsync();
    }



    //===========================================================
    // Analyze
    //===========================================================

    public async Task<ModuleSynchronizationDto> AnalyzeAsync
    (
        long moduleId,

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
            "MODULE SYNCHRONIZATION ANALYZE"
        );

        Console.WriteLine
        (
            $"Requested Module Id : {moduleId}"
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
        // Existing Synchronization
        //=======================================================

        var existing =
            await _context.ModuleSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        !x.IsDeleted

                        &&

                        x.ModuleId ==
                        moduleId

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


            return await GetByIdAsync
            (
                existing.Id
            )

            ?? new ModuleSynchronizationDto();
        }


        Console.WriteLine
        (
            "NO EXISTING SYNCHRONIZATION FOUND."
        );


        //=======================================================
        // Load Navigation Module
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


            return new ModuleSynchronizationDto();
        }


        //=======================================================
        // Build Names
        //=======================================================
        //
        // Folder and file names may contain only:
        // Letters
        // Numbers
        // Hyphen
        //
        // Technical symbols are removed.
        //
        // Example:
        //
        // Accounts & Finance
        //        ↓
        // accounts-finance
        //
        //=======================================================

        var featureName =
            string.Join
            (
                "-",

                module.Name
                    .Trim()
                    .ToLowerInvariant()
                    .Split
                    (
                        ' ',
                        StringSplitOptions.RemoveEmptyEntries
                    )
                    .Select
                    (
                        part =>
                            new string
                            (
                                part
                                    .Where
                                    (
                                        c =>
                                            char.IsLetterOrDigit(c)
                                            || c == '-'
                                    )
                                    .ToArray()
                            )
                    )
                    .Where
                    (
                        part =>
                            !string.IsNullOrWhiteSpace(part)
                    )
            );


        //=======================================================
        // Solution Roots
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


        Console.WriteLine
        (
            $"Current Directory : {currentDirectory}"
        );

        Console.WriteLine
        (
            $"Solution Root     : {solutionRoot}"
        );

        Console.WriteLine
        (
            $"Frontend Root     : {frontendRoot}"
        );

        Console.WriteLine
        (
            $"Backend Root      : {backendRoot}"
        );


        //=======================================================
        // Create Configuration
        //=======================================================

        var configuration =
            new ModuleSynchronizationDto
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
                    module.IsActive
            };


        //=======================================================
        // Analyze Frontend
        //=======================================================

        AnalyzeFrontend
        (
            configuration,

            frontendRoot,

            featureName
        );


        //=======================================================
        // Analyze Backend
        //=======================================================

        AnalyzeBackend
        (
            configuration,

            backendRoot,

            module.Name
        );


        //=======================================================
        // Completed
        //=======================================================

        Console.WriteLine
        (
            "RETURNING DEFAULT CONFIGURATION."
        );


        return configuration;
    }



    //===========================================================
    // Analyze Frontend
    //===========================================================

    private void AnalyzeFrontend
    (
        ModuleSynchronizationDto configuration,

        string frontendRoot,

        string featureName
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
        // Frontend Standard Module Structure
        //=======================================================

        configuration.FrontendModuleFolder =
            Path.Combine
            (
                configuration.FrontendSourceFolder,

                featureName
            );


        configuration.FrontendRoutesFolder =
            Path.Combine
            (
                configuration.FrontendModuleFolder,

                "routes"
            );


        //=======================================================
        // Frontend Application Registration
        //=======================================================

        configuration.FrontendModuleRouteFile =
            Path.Combine
            (
                configuration.FrontendRoutesFolder,

                $"{featureName}.routes.ts"
            );


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
        ModuleSynchronizationDto configuration,

        string backendRoot,

        string moduleName
    )
    {
        //=======================================================
        // Build Backend Module Name
        //=======================================================
        //
        // Backend folder and namespace names:
        //
        // Letters and numbers only.
        //
        // Spaces and technical symbols are removed.
        //
        // Examples:
        //
        // Accounts & Finance
        //        ↓
        // AccountsFinance
        //
        // Human Resource
        //        ↓
        // HumanResource
        //
        //=======================================================

        var backendModuleName =
            new string
            (
                moduleName
                    .Where
                    (
                        c =>
                            char.IsLetterOrDigit(c)
                    )
                    .ToArray()
            );


        //=======================================================
        // Backend Target Location
        //=======================================================

        configuration.BackendSolution =
            backendRoot;

        configuration.BackendApiProject =
            "AppCore.Api";

        configuration.BackendApplicationProject =
            "AppCore.Application";

        configuration.BackendDomainProject =
            "AppCore.Domain";

        configuration.BackendInfrastructureProject =
            "AppCore.Infrastructure";


        //=======================================================
        // Backend Standard Module Structure
        //=======================================================

        configuration.BackendControllerFolder =
            Path.Combine
            (
                backendRoot,
                "AppCore.Api",
                "Controllers",
                backendModuleName
            );

        configuration.BackendApplicationFolder =
            Path.Combine
            (
                backendRoot,
                "AppCore.Application",
                backendModuleName
            );

        configuration.BackendEntityFolder =
            Path.Combine
            (
                backendRoot,
                "AppCore.Domain",
                backendModuleName
            );

        configuration.BackendRepositoryFolder =
            Path.Combine
            (
                backendRoot,
                "AppCore.Infrastructure",
                "Repositories",
                backendModuleName
            );

        configuration.BackendConfigurationFolder =
            Path.Combine
            (
                backendRoot,
                "AppCore.Infrastructure",
                "Configurations",
                backendModuleName
            );


        //=======================================================
        // Backend Application Registration
        //=======================================================

        configuration.DependencyInjectionFile =
            Path.Combine
            (
                backendRoot,
                "AppCore.Infrastructure",
                "DependencyInjection.cs"
            );

        configuration.DbContextFile =
            Path.Combine
            (
                backendRoot,
                "AppCore.Infrastructure",
                "Persistence",
                "AppDbContext.cs"
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
            await _moduleSynchronizationEngine
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
    //
    // Module rollback is blocked ONLY when a dependent Menu
    // Synchronization has ACTUALLY been synchronized.
    //
    // Saving or analyzing a Menu Synchronization does NOT
    // block Module rollback.
    //
    // Dependency:
    //
    // Module Synchronization
    //        ↓
    // ModuleId
    //        ↓
    // Menu Synchronization
    //        ↓
    // Status = Synchronized
    //
    //===========================================================

    public async Task<ModuleSynchronizationRollbackValidationDto?>
        ValidateRollbackAsync
    (
        long synchronizationId
    )
    {
        //=======================================================
        // Load Synchronization
        //=======================================================

        var synchronization =
            await _context.ModuleSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        synchronizationId

                        &&

                        !x.IsDeleted
                );


        //=======================================================
        // Not Found
        //=======================================================

        if
        (
            synchronization == null
        )
        {
            return null;
        }


        //=======================================================
        // Check Successfully Synchronized Menu Dependency
        //=======================================================
        //
        // ONLY Menu Synchronization records with:
        //
        //     Status = "Synchronized"
        //
        // block Module rollback.
        //
        // Pending / Ready / Failed records do NOT block rollback.
        //
        // The dependency must also belong to:
        //
        //     Same Module
        //     Same Synchronization Type
        //
        //=======================================================

        var hasSynchronizedMenu =
            await _context.MenuSynchronizations

                .AsNoTracking()

                .AnyAsync
                (
                    x =>

                        !x.IsDeleted

                        &&

                        x.ModuleId ==
                        synchronization.ModuleId

                        &&

                        x.SynchronizationType ==
                        synchronization.SynchronizationType

                        &&

                        x.Status ==
                        "Synchronized"
                );


        //=======================================================
        // Rollback Blocked
        //=======================================================

        if
        (
            hasSynchronizedMenu
        )
        {
            return new ModuleSynchronizationRollbackValidationDto
            {
                CanRollback =
                    false,

                Message =
                    "Module rollback is blocked because a dependent Menu Synchronization has already been successfully synchronized. Roll back the dependent Menu Synchronization first."
            };
        }


        //=======================================================
        // Rollback Allowed
        //=======================================================

        return new ModuleSynchronizationRollbackValidationDto
        {
            CanRollback =
                true,

            Message =
                "Module rollback is allowed."
        };
    }



    //===========================================================
    // Rollback
    //===========================================================
    //
    // IMPORTANT:
    //
    // Rollback validation is enforced HERE before the engine is
    // called.
    //
    // This prevents callers from bypassing the business rule by
    // directly invoking the repository rollback operation.
    //
    //===========================================================

    public async Task<bool> RollbackAsync
    (
        long id
    )
    {
        //=======================================================
        // Validate Rollback
        //=======================================================

        var validation =
            await ValidateRollbackAsync
            (
                id
            );


        //=======================================================
        // Synchronization Not Found
        //=======================================================

        if
        (
            validation == null
        )
        {
            throw new InvalidOperationException
            (
                "Module synchronization configuration was not found."
            );
        }


        //=======================================================
        // Rollback Blocked
        //=======================================================

        if
        (
            !validation.CanRollback
        )
        {
            throw new InvalidOperationException
            (
                validation.Message
            );
        }


        //=======================================================
        // Execute Rollback
        //=======================================================

        var result =
            await _moduleSynchronizationEngine
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
    // Exists By Module
    //===========================================================

    public async Task<bool> ExistsByModuleAsync
    (
        long moduleId,

        string synchronizationType,

        long? excludeId = null
    )
    {
        return await _context.ModuleSynchronizations.AnyAsync
        (
            x =>

                !x.IsDeleted

                &&

                x.ModuleId ==
                moduleId

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
        CreateModuleSynchronizationDto dto
    )
    {
        const long userId = 1;


        //=======================================================
        // Duplicate Check
        //=======================================================

        var exists =
            await ExistsByModuleAsync
            (
                dto.ModuleId,

                dto.SynchronizationType
            );


        if
        (
            exists
        )
        {
            throw new InvalidOperationException
            (
                $"A {dto.SynchronizationType} synchronization already exists for '{dto.ModuleName}'."
            );
        }


        //=======================================================
        // Create Entity
        //=======================================================

        var synchronization =
            new ModuleSynchronization
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
                // Frontend Standard Module Structure
                //===================================================

                FrontendModuleFolder =
                    dto.FrontendModuleFolder,

                FrontendRoutesFolder =
                    dto.FrontendRoutesFolder,


                //===================================================
                // Frontend Application Registration
                //===================================================

                FrontendModuleRouteFile =
                    dto.FrontendModuleRouteFile,

                FrontendApplicationRouteFile =
                    dto.FrontendApplicationRouteFile,


                //===================================================
                // Backend Target Location
                //===================================================

                BackendSolution =
                    dto.BackendSolution,

                BackendApiProject =
                    dto.BackendApiProject,

                BackendApplicationProject =
                    dto.BackendApplicationProject,

                BackendDomainProject =
                    dto.BackendDomainProject,

                BackendInfrastructureProject =
                    dto.BackendInfrastructureProject,


                //===================================================
                // Backend Standard Module Structure
                //===================================================

                BackendControllerFolder =
                    dto.BackendControllerFolder,

                BackendApplicationFolder =
                    dto.BackendApplicationFolder,

                BackendEntityFolder =
                    dto.BackendEntityFolder,

                BackendRepositoryFolder =
                    dto.BackendRepositoryFolder,

                BackendConfigurationFolder =
                    dto.BackendConfigurationFolder,


                //===================================================
                // Backend Application Registration
                //===================================================

                DependencyInjectionFile =
                    dto.DependencyInjectionFile,

                DbContextFile =
                    dto.DbContextFile,


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


        _context.ModuleSynchronizations.Add
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
                    "Module Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Module Synchronization Created",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration created for '{synchronization.ModuleName}'.",

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
        UpdateModuleSynchronizationDto dto
    )
    {
        const long userId = 1;


        //=======================================================
        // Duplicate Check
        //=======================================================

        var exists =
            await ExistsByModuleAsync
            (
                dto.ModuleId,

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
                $"A {dto.SynchronizationType} synchronization already exists for '{dto.ModuleName}'."
            );
        }


        //=======================================================
        // Load Entity
        //=======================================================

        var synchronization =
            await _context.ModuleSynchronizations

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
        // Frontend Standard Module Structure
        //=======================================================

        synchronization.FrontendModuleFolder =
            dto.FrontendModuleFolder;

        synchronization.FrontendRoutesFolder =
            dto.FrontendRoutesFolder;


        //=======================================================
        // Frontend Application Registration
        //=======================================================

        synchronization.FrontendModuleRouteFile =
            dto.FrontendModuleRouteFile;

        synchronization.FrontendApplicationRouteFile =
            dto.FrontendApplicationRouteFile;


        //=======================================================
        // Backend Target Location
        //=======================================================

        synchronization.BackendSolution =
            dto.BackendSolution;

        synchronization.BackendApiProject =
            dto.BackendApiProject;

        synchronization.BackendApplicationProject =
            dto.BackendApplicationProject;

        synchronization.BackendDomainProject =
            dto.BackendDomainProject;

        synchronization.BackendInfrastructureProject =
            dto.BackendInfrastructureProject;


        //=======================================================
        // Backend Standard Module Structure
        //=======================================================

        synchronization.BackendControllerFolder =
            dto.BackendControllerFolder;

        synchronization.BackendApplicationFolder =
            dto.BackendApplicationFolder;

        synchronization.BackendEntityFolder =
            dto.BackendEntityFolder;

        synchronization.BackendRepositoryFolder =
            dto.BackendRepositoryFolder;

        synchronization.BackendConfigurationFolder =
            dto.BackendConfigurationFolder;


        //=======================================================
        // Backend Application Registration
        //=======================================================

        synchronization.DependencyInjectionFile =
            dto.DependencyInjectionFile;

        synchronization.DbContextFile =
            dto.DbContextFile;


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
                    "Module Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Module Synchronization Updated",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration updated for '{synchronization.ModuleName}'.",

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
            await _context.ModuleSynchronizations

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
        // Validate Dependent Menu Synchronizations
        //=======================================================
        //
        // A Module Synchronization cannot be deleted while
        // any active dependent Menu Synchronization exists.
        //
        // The dependency is checked regardless of the Menu
        // Synchronization status.
        //
        // Frontend and Backend remain independent because the
        // SynchronizationType must match.
        //
        // Deleted Menu Synchronizations do not block deletion.
        //
        //=======================================================

        var hasDependentMenuSynchronizations =
            await _context.MenuSynchronizations

                .AnyAsync
                (
                    x =>

                        !x.IsDeleted

                        &&

                        x.ModuleId ==
                        synchronization.ModuleId

                        &&

                        x.SynchronizationType ==
                        synchronization.SynchronizationType
                );


        if
        (
            hasDependentMenuSynchronizations
        )
        {
            throw new InvalidOperationException
            (
                $"Module '{synchronization.ModuleName}' cannot be deleted because dependent Menu Synchronization data exists. Delete the dependent Menu Synchronization first."
            );
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
                    "Module Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Module Synchronization Deleted",

                ActivityDescription =
                    $"'{synchronization.SynchronizationType}' synchronization configuration deleted for '{synchronization.ModuleName}'.",

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
        var entity =
            await _context.ModuleSynchronizations

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


        entity.IsDeleted =
            false;

        entity.DeletedDate =
            null;

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
                    "Module Synchronization",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Module Synchronization Restored",

                ActivityDescription =
                    $"'{entity.SynchronizationType}' synchronization configuration restored for '{entity.ModuleName}'.",

                PerformedBy =
                    1,

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