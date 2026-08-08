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

//===============================================================
// Navigation Management
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.Module.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

//===============================================================
// Development Management
//===============================================================

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.Interfaces;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.Interfaces;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.Interfaces;

using AppCore.Application.Platform.BackendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.FrontendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.MenuFrontendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.MenuBackendSynchronizationEngine.Interfaces;
using AppCore.Infrastructure.Platform.Synchronization;

//===============================================================
// Platform Common
//===============================================================

using AppCore.Application.Platform.CommonInterfaces;
using AppCore.Infrastructure.Platform.Common;

//===============================================================
// Human Resource Setup
//===============================================================

using AppCore.Application.Contracts.Persistence.HumanResource.HumanResourceSetup;
using AppCore.Application.HumanResource.HumanResourceSetup.Designation.Interfaces;

//===============================================================
// Security & Permission
//===============================================================

using AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.Interfaces;
using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.Interfaces;

//===============================================================
// Repositories
//===============================================================

using AppCore.Infrastructure.Repositories.Common;

using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Module;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Menu;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Submenu;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Activity;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.MasterActivity;

using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement;

using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.ProjectSynchronization;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.MenuSynchronization;

using AppCore.Infrastructure.Repositories.HumanResource.HumanResourceSetup;
using AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;


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

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection")));

        //=======================================================
        // Common Repository
        //=======================================================

        services.AddScoped<IActivityHistoryRepository, ActivityHistoryRepository>();

        //=======================================================
        // Navigation Management Repository
        //=======================================================

        services.AddScoped<INavigationModuleRepository, NavigationModuleRepository>();

        services.AddScoped<INavigationMenuRepository, NavigationMenuRepository>();

        services.AddScoped<INavigationSubmenuRepository, NavigationSubmenuRepository>();

        services.AddScoped<INavigationActivityRepository, NavigationActivityRepository>();

        services.AddScoped<IMasterActivityRepository, MasterActivityRepository>();

        services.AddScoped<ISidebarRepository, SidebarRepository>();

        //=======================================================
        // Development Management Repository
        //=======================================================

        services.AddScoped<IProjectSynchronizationRepository, ProjectSynchronizationRepository>();

        services.AddScoped<IModuleSynchronizationRepository, ModuleSynchronizationRepository>();

        services.AddScoped<IMenuSynchronizationRepository, MenuSynchronizationRepository>();

        //=======================================================
        // Platform Common
        //=======================================================

        services.AddScoped<ITemplateLoader, TemplateLoader>();

        services.AddScoped<IPlaceholderEngine, PlaceholderEngine>();

        services.AddScoped<IFileGenerator, FileGenerator>();

        services.AddScoped<IFileUpdater, FileUpdater>();

        services.AddScoped<IFileRemover, FileRemover>();

        //=======================================================
        // Development Management Engine
        //=======================================================

        services.AddScoped<IModuleSynchronizationEngine, ModuleSynchronizationEngine>();

        services.AddScoped<IMenuSynchronizationEngine, MenuSynchronizationEngine>();


        //=======================================================
        // Module Synchronization Engine
        //=======================================================

        services.AddScoped<IBackendSynchronizationEngine, ModuleBackendSynchronizationEngine>();

        services.AddScoped<IFrontendSynchronizationEngine, ModuleFrontendSynchronizationEngine>();


        //=======================================================
        // Menu Synchronization Engine
        //=======================================================

        services.AddScoped<IMenuBackendSynchronizationEngine, MenuBackendSynchronizationEngine>();

        services.AddScoped<IMenuFrontendSynchronizationEngine, MenuFrontendSynchronizationEngine>();

        //=======================================================
        // AUTO REGISTER REPOSITORIES
        //=======================================================
        // services.AddScoped<ISettingsRepository, SettingsRepository>();
  

        //=======================================================
        // AUTO REGISTER SERVICES
        //=======================================================


        //=======================================================
        // Human Resource Setup Repository
        //=======================================================

        services.AddScoped<IDepartmentRepository, DepartmentRepository>();

        services.AddScoped<IDesignationRepository, DesignationRepository>();

        //=======================================================
        // Security & Permission Repository
        //=======================================================

        services.AddScoped<IRoleProfileRepository, RoleProfileRepository>();

        services.AddScoped<IActivityAssignmentRepository, ActivityAssignmentRepository>();

        services.AddScoped<IActivityAssignmentDetailRepository, ActivityAssignmentDetailRepository>();

        return services;
    }
}