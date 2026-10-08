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
using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;
using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Module;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Menu;
using AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.Submenu;
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
// Platform Authentication
//===============================================================

using AppCore.Application.Platform.Authentication.Interfaces;

using AppCore.Infrastructure.Platform.Authentication;


//===============================================================
// Platform Effective Access
//===============================================================

using AppCore.Application.Platform.EffectiveAccess.Interfaces;

using AppCore.Infrastructure.Platform.EffectiveAccess;


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

// AUTO-BEGIN : ProductCategory

using AppCore.Application.Settings.ProductSettings;
using AppCore.Infrastructure.Configurations.Settings.ProductSettings;

// AUTO-END : ProductCategory


// AUTO-BEGIN : FinancialYears

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;

// AUTO-END : FinancialYears

// AUTO-BEGIN : SystemConfigurations

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;

// AUTO-END : SystemConfigurations

// AUTO-BEGIN : AccountSubGroup

using AppCore.Application.Settings.AccountSettings;
using AppCore.Infrastructure.Configurations.Settings.AccountSettings;

// AUTO-END : AccountSubGroup

// AUTO-BEGIN : AccountGroup

using AppCore.Application.Settings.AccountSettings;
using AppCore.Infrastructure.Configurations.Settings.AccountSettings;

// AUTO-END : AccountGroup

// AUTO-BEGIN : AccountClass

using AppCore.Application.Settings.AccountSettings;
using AppCore.Infrastructure.Configurations.Settings.AccountSettings;

// AUTO-END : AccountClass

// AUTO-BEGIN : BranchAssignment

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;

// AUTO-END : BranchAssignment

// AUTO-BEGIN : Warehouses

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;

// AUTO-END : Warehouses

// AUTO-BEGIN : Branches

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;

// AUTO-END : Branches




// AUTO-BEGIN : Wings

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;

// AUTO-END : Wings


// AUTO-BEGIN : SubOrdinateComponents

using AppCore.Application.InfrastructureControl.LoginComponents;
using AppCore.Infrastructure.Repositories.InfrastructureControl.LoginComponents;

// AUTO-END : SubOrdinateComponents

// AUTO-BEGIN : CoreComponents

using AppCore.Application.InfrastructureControl.LoginComponents;
using AppCore.Infrastructure.Repositories.InfrastructureControl.LoginComponents;

// AUTO-END : CoreComponents



// AUTO-BEGIN : Company

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;

// AUTO-END : Company

// AUTO-BEGIN : WidgetConfiguration

using AppCore.Application.InfrastructureControl.ApplicationConfiguration;
using AppCore.Infrastructure.Repositories.InfrastructureControl.ApplicationConfiguration;

// AUTO-END : WidgetConfiguration



// AUTO-BEGIN : RoleBasedDBComponents

using AppCore.Application.InfrastructureControl.DashboardComponents;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DashboardComponents;

// AUTO-END : RoleBasedDBComponents

// AUTO-BEGIN : DefaultDBComponents

using AppCore.Application.InfrastructureControl.DashboardComponents;
using AppCore.Infrastructure.Repositories.InfrastructureControl.DashboardComponents;

// AUTO-END : DefaultDBComponents



// AUTO-BEGIN : Dashboards

using AppCore.Application.InfrastructureControl.ApplicationConfiguration;
using AppCore.Infrastructure.Repositories.InfrastructureControl.ApplicationConfiguration;

// AUTO-END : Dashboards













// AUTO-BEGIN : LoginPages

using AppCore.Application.InfrastructureControl.ApplicationConfiguration;
using AppCore.Infrastructure.Repositories.InfrastructureControl.ApplicationConfiguration;

// AUTO-END : LoginPages





// AUTO-BEGIN : ApplicationComponents

using AppCore.Application.InfrastructureControl.ComponentManagement;
using AppCore.Infrastructure.Repositories.InfrastructureControl.ComponentManagement;

// AUTO-END : ApplicationComponents


// AUTO-BEGIN : SpecialAssignment

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;

// AUTO-END : SpecialAssignment




// AUTO-BEGIN : RoleAssignment

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;

// AUTO-END : RoleAssignment

// AUTO-BEGIN : UserProfile

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;

// AUTO-END : UserProfile







// AUTO-BEGIN : ActivityAssignment

using AppCore.Application.SecurityPermission.RoleManagement;
using AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;

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
        // Authentication Repository
        //=======================================================

        services.AddScoped
        <
            IAuthenticationRepository,
            AuthenticationRepository
        >();


        //=======================================================
        // Effective Access Repository
        //=======================================================

        services.AddScoped
        <
            IEffectiveAccessRepository,
            EffectiveAccessRepository
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
        // Page Cloning Repository
        //=======================================================

        services.AddScoped
        <
            IPageCloningRepository,
            PageCloningRepository
        >();

        //=======================================================
        // AUTO REGISTER SERVICES
        //=======================================================

        // AUTO-BEGIN : AUTO REGISTER SERVICES

        // AUTO-BEGIN : ProductSubCategory

        services.AddScoped
        <
            IProductSubCategoryRepository,
            ProductSubCategoryRepository
        >();

        // AUTO-END : ProductSubCategory

        // AUTO-BEGIN : AccountSubGroup

        services.AddScoped
        <
            IAccountSubGroupRepository,
            AccountSubGroupRepository
        >();

        // AUTO-END : AccountSubGroup

        // AUTO-BEGIN : ProductCategory

        services.AddScoped
        <
            IProductCategoryRepository,
            ProductCategoryRepository
        >();

        // AUTO-END : ProductCategory




        // AUTO-BEGIN : FinancialYears

        services.AddScoped
        <
            IFinancialYearsRepository,
            FinancialYearsRepository
        >();

        // AUTO-END : FinancialYears

        // AUTO-BEGIN : SystemConfigurations

        services.AddScoped
        <
            ISystemConfigurationsRepository,
            SystemConfigurationsRepository
        >();

        // AUTO-END : SystemConfigurations


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

        // AUTO-BEGIN : BranchAssignment

        services.AddScoped
        <
            IBranchAssignmentRepository,
            BranchAssignmentRepository
        >();

        // AUTO-END : BranchAssignment

        // AUTO-BEGIN : Warehouses

        services.AddScoped
        <
            IWarehousesRepository,
            WarehousesRepository
        >();

        // AUTO-END : Warehouses

        // AUTO-BEGIN : Branches

        services.AddScoped
        <
            IBranchesRepository,
            BranchesRepository
        >();

        // AUTO-END : Branches




        // AUTO-BEGIN : Wings

        services.AddScoped
        <
            IWingsRepository,
            WingsRepository
        >();

        // AUTO-END : Wings





        // AUTO-BEGIN : SubOrdinateComponents

        services.AddScoped
        <
            ISubOrdinateComponentsRepository,
            SubOrdinateComponentsRepository
        >();

        // AUTO-END : SubOrdinateComponents

        // AUTO-BEGIN : CoreComponents

        services.AddScoped
        <
            ICoreComponentsRepository,
            CoreComponentsRepository
        >();

        // AUTO-END : CoreComponents



        // AUTO-BEGIN : Company

        services.AddScoped
        <
            ICompanyRepository,
            CompanyRepository
        >();

        // AUTO-END : Company

        // AUTO-BEGIN : WidgetConfiguration

        services.AddScoped
        <
            IWidgetConfigurationRepository,
            WidgetConfigurationRepository
        >();

        // AUTO-END : WidgetConfiguration



        // AUTO-BEGIN : RoleBasedDBComponents

        services.AddScoped
        <
            IRoleBasedDBComponentsRepository,
            RoleBasedDBComponentsRepository
        >();

        // AUTO-END : RoleBasedDBComponents

        // AUTO-BEGIN : DefaultDBComponents

        services.AddScoped
        <
            IDefaultDBComponentsRepository,
            DefaultDBComponentsRepository
        >();

        // AUTO-END : DefaultDBComponents



        // AUTO-BEGIN : Dashboards

        services.AddScoped
        <
            IDashboardsRepository,
            DashboardsRepository
        >();

        // AUTO-END : Dashboards













        // AUTO-BEGIN : LoginPages

        services.AddScoped
        <
            ILoginPagesRepository,
            LoginPagesRepository
        >();

        // AUTO-END : LoginPages





        // AUTO-BEGIN : ApplicationComponents

        services.AddScoped
        <
            IApplicationComponentsRepository,
            ApplicationComponentsRepository
        >();

        // AUTO-END : ApplicationComponents


        // AUTO-BEGIN : SpecialAssignment

        services.AddScoped
        <
            ISpecialAssignmentRepository,
            SpecialAssignmentRepository
        >();

        // AUTO-END : SpecialAssignment




        // AUTO-BEGIN : RoleAssignment

        services.AddScoped
        <
            IRoleAssignmentRepository,
            RoleAssignmentRepository
        >();

        // AUTO-END : RoleAssignment

        // AUTO-BEGIN : UserProfile

        services.AddScoped
        <
            IUserProfileRepository,
            UserProfileRepository
        >();

        // AUTO-END : UserProfile







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