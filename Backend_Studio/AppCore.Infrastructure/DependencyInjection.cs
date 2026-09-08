//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Activity History
//===============================================================

using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Infrastructure.Repositories.Common;


//===============================================================
// Navigation Management
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.Module.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Module;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Menu;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Submenu;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Activity;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.MasterActivity;

using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement;


//===============================================================
// Development Management
//===============================================================

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.Interfaces;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.Interfaces;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.Interfaces;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.Interfaces;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.Interfaces;

using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.ProjectSynchronization;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.MenuSynchronization;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Platform Common
//===============================================================

using AppCore.Application.Platform.CommonInterfaces;

using AppCore.Infrastructure.Platform.Common;


//===============================================================
// Module Synchronization Engines
//===============================================================

using AppCore.Application.Platform.BackendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.FrontendSynchronizationEngine.Interfaces;


//===============================================================
// Menu Synchronization Engines
//===============================================================

using AppCore.Application.Platform.MenuBackendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.MenuFrontendSynchronizationEngine.Interfaces;


//===============================================================
// Submenu Synchronization Engines
//===============================================================

using AppCore.Application.Platform.SubmenuFrontendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.SubmenuBackendSynchronizationEngine.Interfaces;


//===============================================================
// Code Synchronization Engines
//===============================================================

using AppCore.Application.Platform.SynchronizationEngineInterfaces.CodeSynchronizationEngine;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendRegistrationEngine;


//===============================================================
// Database Migration Engine Interface
//===============================================================

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Backend Project Builder
//===============================================================

using AppCore.Application.Platform.ProjectBuilderInterfaces;

using AppCore.Infrastructure.Platform.ProjectBuilder.BackendProjectBuilder;
using AppCore.Infrastructure.Platform.ProjectBuilder.Shared;


//===============================================================
// Platform Synchronization Implementations
//===============================================================

using AppCore.Infrastructure.Platform.Synchronization;

using AppCore.Infrastructure.Platform.Synchronization.CodeSynchronizationEngine;

using AppCore.Infrastructure.Platform.Synchronization.BackendRegistrationEngine;


//===============================================================
// Database Migration Engine
//===============================================================

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine;


//===============================================================
// Database Creation Engine
//===============================================================

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine;

//===============================================================
// AUTO REGISTER NAMESPACES
//===============================================================

// AUTO-BEGIN : AUTO REGISTER NAMESPACES

// AUTO-BEGIN : Company

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Configurations.Settings.GeneralSettings;

// AUTO-END : Company



// AUTO-END : AUTO REGISTER NAMESPACES


//===============================================================
// Dependency Injection
//===============================================================

public static class DependencyInjection
{

    //===========================================================
    // Register Infrastructure Services
    //===========================================================

    public static IServiceCollection AddInfrastructure
    (
        this IServiceCollection services,

        IConfiguration configuration
    )
    {

        //=======================================================
        // Database Context
        //=======================================================

        services.AddDbContext<AppDbContext>
        (
            options =>
                options.UseNpgsql
                (
                    configuration.GetConnectionString
                    (
                        "DefaultConnection"
                    )
                )
        );


        //=======================================================
        // Activity History Repository
        //=======================================================

        services.AddScoped
        <
            IActivityHistoryRepository,
            ActivityHistoryRepository
        >();


        //=======================================================
        // Navigation Management Repositories
        //=======================================================

        services.AddScoped
        <
            INavigationModuleRepository,
            NavigationModuleRepository
        >();

        services.AddScoped
        <
            INavigationMenuRepository,
            NavigationMenuRepository
        >();

        services.AddScoped
        <
            INavigationSubmenuRepository,
            NavigationSubmenuRepository
        >();

        services.AddScoped
        <
            INavigationActivityRepository,
            NavigationActivityRepository
        >();

        services.AddScoped
        <
            IMasterActivityRepository,
            MasterActivityRepository
        >();

        services.AddScoped
        <
            ISidebarRepository,
            SidebarRepository
        >();


        //=======================================================
        // Development Management Repositories
        //=======================================================

        services.AddScoped
        <
            IProjectSynchronizationRepository,
            ProjectSynchronizationRepository
        >();

        services.AddScoped
        <
            IModuleSynchronizationRepository,
            ModuleSynchronizationRepository
        >();

        services.AddScoped
        <
            IMenuSynchronizationRepository,
            MenuSynchronizationRepository
        >();

        services.AddScoped
        <
            ISubmenuSynchronizationRepository,
            SubmenuSynchronizationRepository
        >();

        services.AddScoped
        <
            ICodeSynchronizationRepository,
            CodeSynchronizationRepository
        >();


        //=======================================================
        // AUTO REGISTER SERVICES
        //=======================================================

        // AUTO-BEGIN : AUTO REGISTER SERVICES

        // AUTO-BEGIN : Company

        services.AddScoped
        <
            ICompanyRepository,
            CompanyRepository
        >();

        // AUTO-END : Company



        // AUTO-END : AUTO REGISTER SERVICES


        //=======================================================
        // Platform Common Services
        //=======================================================

        services.AddScoped
        <
            ITemplateLoader,
            TemplateLoader
        >();

        services.AddScoped
        <
            IPlaceholderEngine,
            PlaceholderEngine
        >();

        services.AddScoped
        <
            IFileGenerator,
            FileGenerator
        >();

        services.AddScoped
        <
            IFileUpdater,
            FileUpdater
        >();

        services.AddScoped
        <
            IFileRemover,
            FileRemover
        >();


        //=======================================================
        // Module Synchronization Engines
        //=======================================================

        services.AddScoped
        <
            IBackendSynchronizationEngine,
            ModuleBackendSynchronizationEngine
        >();

        services.AddScoped
        <
            IFrontendSynchronizationEngine,
            ModuleFrontendSynchronizationEngine
        >();


        //=======================================================
        // Menu Synchronization Engines
        //=======================================================

        services.AddScoped
        <
            IMenuBackendSynchronizationEngine,
            MenuBackendSynchronizationEngine
        >();

        services.AddScoped
        <
            IMenuFrontendSynchronizationEngine,
            MenuFrontendSynchronizationEngine
        >();


        //=======================================================
        // Submenu Synchronization Engines
        //=======================================================

        services.AddScoped
        <
            ISubmenuFrontendSynchronizationEngine,
            SubmenuFrontendSynchronizationEngine
        >();

        services.AddScoped
        <
            ISubmenuBackendSynchronizationEngine,
            SubmenuBackendSynchronizationEngine
        >();


        //=======================================================
        // Code Synchronization Engines
        //=======================================================

        services.AddScoped
        <
            IFrontendCodeSynchronizationEngine,
            FrontendCodeSynchronizationEngine
        >();

        services.AddScoped
        <
            IBackendCodeSynchronizationEngine,
            BackendCodeSynchronizationEngine
        >();

        services.AddScoped
        <
            IBackendRegistrationEngine,
            BackendRegistrationEngine
        >();

        services.AddScoped
        <
            ICodeSynchronizationEngine,
            CodeSynchronizationEngine
        >();


        //=======================================================
        // Backend Project Builder
        //=======================================================

        services.AddScoped
        <
            BackendProjectBuildContextResolver
        >();

        services.AddScoped
        <
            BackendProjectBuildValidator
        >();

        services.AddScoped
        <
            BackendProjectBuildExecutor
        >();

        services.AddScoped
        <
            IBackendProjectBuilder,
            AppCore.Infrastructure.Platform.ProjectBuilder.BackendProjectBuilder.BackendProjectBuilder
        >();


        //=======================================================
        // Database Migration Engine
        //=======================================================

        services.AddScoped
        <
            MigrationProjectResolver
        >();

        services.AddScoped
        <
            MigrationNameBuilder
        >();

        services.AddScoped
        <
            MigrationCommandExecutor
        >();

        services.AddScoped
        <
            MigrationFileManager
        >();

        services.AddScoped
        <
            MigrationSnapshotManager
        >();

        services.AddScoped
        <
            MigrationValidator
        >();

        services.AddScoped
        <
            IDatabaseMigrationEngine,
            DatabaseMigrationEngine
        >();

        //=======================================================
        // Database Creation Engine
        //=======================================================

        services.AddScoped
        <
            DatabaseProjectResolver
        >();

        services.AddScoped
        <
            DatabaseValidator
        >();

        services.AddScoped
        <
            DatabaseCommandExecutor
        >();

        services.AddScoped
        <
            IDatabaseCreationEngine,
            DatabaseEngine
        >();

        //=======================================================
        // Development Management Engines
        //=======================================================

        services.AddScoped
        <
            IModuleSynchronizationEngine,
            ModuleSynchronizationEngine
        >();

        services.AddScoped
        <
            IMenuSynchronizationEngine,
            MenuSynchronizationEngine
        >();

        services.AddScoped
        <
            ISubmenuSynchronizationEngine,
            SubmenuSynchronizationEngine
        >();


        //=======================================================
        // Return Services
        //=======================================================

        return services;
    }
}