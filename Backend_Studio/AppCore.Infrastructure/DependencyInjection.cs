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
// Database Creation Engine Interface
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
// Database Creation Engine
//===============================================================

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine;


//===============================================================
// AUTO REGISTER NAMESPACES
//===============================================================

// AUTO-BEGIN : AUTO REGISTER NAMESPACES

// AUTO-BEGIN : ActivityAssignment

using AppCore.Application.SecurityPermission.RoleManagement;
using AppCore.Infrastructure.Configurations.SecurityPermission.RoleManagement;

// AUTO-END : ActivityAssignment

// AUTO-BEGIN : RoleProfile

using AppCore.Application.SecurityPermission.RoleManagement;
using AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;

// AUTO-END : RoleProfile

// AUTO-BEGIN : PaymentVoucher

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Infrastructure.Configurations.AccountsFinance.VoucherManagement;

// AUTO-END : PaymentVoucher

// AUTO-BEGIN : ReceiptVoucher

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Infrastructure.Configurations.AccountsFinance.VoucherManagement;

// AUTO-END : ReceiptVoucher




// AUTO-BEGIN : Designation

using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Infrastructure.Configurations.HumanResourceManangement.HumanResourceSetup;

// AUTO-END : Designation

// AUTO-BEGIN : Department

using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Infrastructure.Configurations.HumanResourceManangement.HumanResourceSetup;

// AUTO-END : Department

// AUTO-BEGIN : DeploymentCenter

using AppCore.Application.InfrastructureControl.CodeManagement;
using AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;

// AUTO-END : DeploymentCenter

// AUTO-BEGIN : ServerManagement

using AppCore.Application.InfrastructureControl.CodeManagement;
using AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;

// AUTO-END : ServerManagement

// AUTO-BEGIN : SourceControl

using AppCore.Application.InfrastructureControl.CodeManagement;
using AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;

// AUTO-END : SourceControl





// AUTO-BEGIN : UtilityComponents

using AppCore.Application.InfrastructureControl.ComponentManagement;
using AppCore.Infrastructure.Configurations.InfrastructureControl.ComponentManagement;

// AUTO-END : UtilityComponents

// AUTO-BEGIN : LayoutComponents

using AppCore.Application.InfrastructureControl.ComponentManagement;
using AppCore.Infrastructure.Configurations.InfrastructureControl.ComponentManagement;

// AUTO-END : LayoutComponents

// AUTO-BEGIN : ControlComponents

using AppCore.Application.InfrastructureControl.ComponentManagement;
using AppCore.Infrastructure.Configurations.InfrastructureControl.ComponentManagement;

// AUTO-END : ControlComponents




// AUTO-BEGIN : Company

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Configurations.Settings.GeneralSettings;

// AUTO-END : Company

// AUTO-BEGIN : Branch

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Configurations.Settings.GeneralSettings;

// AUTO-END : Branch

// AUTO-BEGIN : AccountGroup

using AppCore.Application.Settings.AccountSettings;
using AppCore.Infrastructure.Configurations.Settings.AccountSettings;

// AUTO-END : AccountGroup

// AUTO-BEGIN : AccountClass

using AppCore.Application.Settings.AccountSettings;
using AppCore.Infrastructure.Configurations.Settings.AccountSettings;

// AUTO-END : AccountClass


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

        // AUTO-BEGIN : ActivityAssignment

        services.AddScoped
        <
            IActivityAssignmentRepository,
            ActivityAssignmentRepository
        >();

        // AUTO-END : ActivityAssignment

        // AUTO-BEGIN : RoleProfile

        services.AddScoped
        <
            IRoleProfileRepository,
            RoleProfileRepository
        >();

        // AUTO-END : RoleProfile


        // AUTO-BEGIN : PaymentVoucher

        services.AddScoped
        <
            IPaymentVoucherRepository,
            PaymentVoucherRepository
        >();

        // AUTO-END : PaymentVoucher

        // AUTO-BEGIN : ReceiptVoucher

        services.AddScoped
        <
            IReceiptVoucherRepository,
            ReceiptVoucherRepository
        >();

        // AUTO-END : ReceiptVoucher




        // AUTO-BEGIN : Designation

        services.AddScoped
        <
            IDesignationRepository,
            DesignationRepository
        >();

        // AUTO-END : Designation

        // AUTO-BEGIN : Department

        services.AddScoped
        <
            IDepartmentRepository,
            DepartmentRepository
        >();

        // AUTO-END : Department

        // AUTO-BEGIN : DeploymentCenter

        services.AddScoped
        <
            IDeploymentCenterRepository,
            DeploymentCenterRepository
        >();

        // AUTO-END : DeploymentCenter

        // AUTO-BEGIN : ServerManagement

        services.AddScoped
        <
            IServerManagementRepository,
            ServerManagementRepository
        >();

        // AUTO-END : ServerManagement

        // AUTO-BEGIN : SourceControl

        services.AddScoped
        <
            ISourceControlRepository,
            SourceControlRepository
        >();

        // AUTO-END : SourceControl

        // AUTO-BEGIN : UtilityComponents

        services.AddScoped
        <
            IUtilityComponentsRepository,
            UtilityComponentsRepository
        >();

        // AUTO-END : UtilityComponents

        // AUTO-BEGIN : LayoutComponents

        services.AddScoped
        <
            ILayoutComponentsRepository,
            LayoutComponentsRepository
        >();

        // AUTO-END : LayoutComponents

        // AUTO-BEGIN : ControlComponents

        services.AddScoped
        <
            IControlComponentsRepository,
            ControlComponentsRepository
        >();

        // AUTO-END : ControlComponents




        // AUTO-BEGIN : Company

        services.AddScoped
        <
            ICompanyRepository,
            CompanyRepository
        >();

        // AUTO-END : Company

        // AUTO-BEGIN : Branch

        services.AddScoped
        <
            IBranchRepository,
            BranchRepository
        >();

        // AUTO-END : Branch

        // AUTO-BEGIN : AccountGroup

        services.AddScoped
        <
            IAccountGroupRepository,
            AccountGroupRepository
        >();

        // AUTO-END : AccountGroup

        // AUTO-BEGIN : AccountClass

        services.AddScoped
        <
            IAccountClassRepository,
            AccountClassRepository
        >();

        // AUTO-END : AccountClass

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
        // Database Creation Engine
        //=======================================================

        services.AddScoped
        <
            DatabaseProjectResolver
        >();

        services.AddScoped
        <
            DatabaseConnectionResolver
        >();

        services.AddScoped
        <
            DatabaseCommandExecutor
        >();

        services.AddScoped
        <
            DatabaseOperationResolver
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