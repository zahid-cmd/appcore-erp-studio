//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using AppCore.Infrastructure.Persistence;

// Activity History

using AppCore.Application.Common.ActivityHistory.Interfaces;

// Navigation Management

using AppCore.Application.InfrastructureControl.NavigationManagement.Module.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Menu.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

// Human Resource Setup


// Repositories

using AppCore.Infrastructure.Repositories.Common;

using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Module;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Menu;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Submenu;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Activity;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.MasterActivity;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure;

//===============================================================
// Dependency Injection
//===============================================================

public static class DependencyInjection
{
    //===========================================================
    // Register Infrastructure Services
    //===========================================================

    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
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
        // Human Resource Setup Repository
        //=======================================================



        //=======================================================
        // Security & Permission Repository
        //=======================================================


        return services;
    }
}