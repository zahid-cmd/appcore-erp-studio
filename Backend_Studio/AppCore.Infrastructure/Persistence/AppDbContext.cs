//=============================================================== 
// Namespaces 
//=============================================================== 
 
using Microsoft.EntityFrameworkCore; 
 
using AppCore.Domain.Common; 
 
using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement; 
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement; 
 
using AppCore.Domain.InfrastructureControl.DevelopmentManagement; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Infrastructure.Persistence; 
 
 
//=============================================================== 
// Application Database Context 
//=============================================================== 
 
public class AppDbContext 
    : DbContext 
{ 
 
    //=========================================================== 
    // Constructor 
    //=========================================================== 
 
    public AppDbContext 
    ( 
        DbContextOptions<AppDbContext> options 
    ) 
        : base(options) 
    { 
    } 
 
 
    //=========================================================== 
    // Navigation Management 
    //=========================================================== 
 
    public DbSet<NavigationModule> 
        NavigationModules 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<NavigationMenu> 
        NavigationMenus 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<NavigationSubmenu> 
        NavigationSubmenus 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<NavigationActivity> 
        NavigationActivities 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<MasterActivity> 
        MasterActivities 
        { 
            get; 
            set; 
        } = null!; 
 
 
    //=========================================================== 
    // Development Management 
    //=========================================================== 
 
    public DbSet<ProjectSynchronization> 
        ProjectSynchronizations 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<ModuleSynchronization> 
        ModuleSynchronizations 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<MenuSynchronization> 
        MenuSynchronizations 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<SubmenuSynchronization> 
        SubmenuSynchronizations 
        { 
            get; 
            set; 
        } = null!; 
 
 
    public DbSet<CodeSynchronization> 
        CodeSynchronizations 
        { 
            get; 
            set; 
        } = null!; 
 
 
    //=========================================================== 
    // Common 
    //=========================================================== 
 
    public DbSet<ActivityHistory> 
        ActivityHistories 
        { 
            get; 
            set; 
        } = null!; 
 
 
    //=========================================================== 
    // AUTO REGISTER DBSETS 
    //=========================================================== 
 
    // AUTO-BEGIN : AUTO REGISTER DBSETS 

    // AUTO-BEGIN : AccountClass

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.AccountClass>
    AccountClasss
    {
    get;
    set;
    } = null!;

    // AUTO-END : AccountClass

    // AUTO-BEGIN : AccountGroup

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup>
    AccountGroups
    {
    get;
    set;
    } = null!;

    // AUTO-END : AccountGroup

    // AUTO-BEGIN : Branch

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Branch>
    Branchs
    {
    get;
    set;
    } = null!;

    // AUTO-END : Branch

    // AUTO-BEGIN : Company

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Company>
    Companys
    {
    get;
    set;
    } = null!;

    // AUTO-END : Company




    // AUTO-BEGIN : ControlComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.ControlComponents>
    ControlComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : ControlComponents

    // AUTO-BEGIN : LayoutComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.LayoutComponents>
    LayoutComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : LayoutComponents

    // AUTO-BEGIN : UtilityComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.UtilityComponents>
    UtilityComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : UtilityComponents






    // AUTO-BEGIN : SourceControl

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.CodeManagement.SourceControl>
    SourceControls
    {
    get;
    set;
    } = null!;

    // AUTO-END : SourceControl

    // AUTO-BEGIN : ServerManagement

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>
    ServerManagements
    {
    get;
    set;
    } = null!;

    // AUTO-END : ServerManagement

    // AUTO-BEGIN : DeploymentCenter

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter>
    DeploymentCenters
    {
    get;
    set;
    } = null!;

    // AUTO-END : DeploymentCenter

    // AUTO-BEGIN : Department

    public DbSet<AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup.Department>
    Departments
    {
    get;
    set;
    } = null!;

    // AUTO-END : Department

    // AUTO-BEGIN : Designation

    public DbSet<AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup.Designation>
    Designations
    {
    get;
    set;
    } = null!;

    // AUTO-END : Designation

    // AUTO-BEGIN : ReceiptVoucher

    public DbSet<AppCore.Domain.Entities.AccountsFinance.VoucherManagement.ReceiptVoucher>
    ReceiptVouchers
    {
    get;
    set;
    } = null!;

    // AUTO-END : ReceiptVoucher

    // AUTO-BEGIN : PaymentVoucher

    public DbSet<AppCore.Domain.Entities.AccountsFinance.VoucherManagement.PaymentVoucher>
    PaymentVouchers
    {
    get;
    set;
    } = null!;

    // AUTO-END : PaymentVoucher

    // AUTO-BEGIN : ActivityAssignment

    public DbSet<AppCore.Domain.Entities.SecurityPermission.RoleManagement.ActivityAssignment>
    ActivityAssignments
    {
        get;
        set;
    } = null!;

    // AUTO-END : ActivityAssignment


    // AUTO-BEGIN : RoleProfile

    public DbSet<AppCore.Domain.Entities.SecurityPermission.RoleManagement.RoleProfile>
    RoleProfiles
    {
    get;
    set;
    } = null!;

    // AUTO-END : RoleProfile









    // AUTO-BEGIN : UserProfile

    public DbSet<AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile>
    UserProfiles
    {
    get;
    set;
    } = null!;

    // AUTO-END : UserProfile

    // AUTO-BEGIN : RoleAssignment

    public DbSet<AppCore.Domain.Entities.SecurityPermission.UserManagement.RoleAssignment>
    RoleAssignments
    {
    get;
    set;
    } = null!;

    // AUTO-END : RoleAssignment




    // AUTO-BEGIN : SpecialAssignment

    public DbSet<AppCore.Domain.Entities.SecurityPermission.UserManagement.SpecialAssignment>
    SpecialAssignments
    {
    get;
    set;
    } = null!;

    // AUTO-END : SpecialAssignment


    // AUTO-BEGIN : ApplicationComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.ApplicationComponents>
    ApplicationComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : ApplicationComponents





    // AUTO-BEGIN : LoginPages

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>
    LoginPagess
    {
    get;
    set;
    } = null!;

    // AUTO-END : LoginPages

    // AUTO-BEGIN : LoginComponent1

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.LoginComponents.LoginComponent1>
    LoginComponent1s
    {
    get;
    set;
    } = null!;

    // AUTO-END : LoginComponent1

    // AUTO-BEGIN : LoginComponent2

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.LoginComponents.LoginComponent2>
    LoginComponent2s
    {
    get;
    set;
    } = null!;

    // AUTO-END : LoginComponent2

    // AUTO-BEGIN : LoginComponent3

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.LoginComponents.LoginComponent3>
    LoginComponent3s
    {
    get;
    set;
    } = null!;

    // AUTO-END : LoginComponent3

    // AUTO-END : AUTO REGISTER DBSETS 
 
    //=========================================================== 
    // Configure Entity Models 
    //=========================================================== 
 
    protected override void OnModelCreating 
    ( 
        ModelBuilder modelBuilder 
    ) 
    { 
 
        //======================================================= 
        // Base Configuration 
        //======================================================= 
 
        base.OnModelCreating 
        ( 
            modelBuilder 
        ); 
 
 
        //=======================================================
        // Apply Registered Entity Configurations
        //=======================================================

        modelBuilder.ApplyConfigurationsFromAssembly
        (
            typeof(AppDbContext).Assembly,

            configurationType =>
            {

                //===================================================
                // Resolve Configuration Interface
                //===================================================

                Type?
                    configurationInterface =
                        configurationType
                            .GetInterfaces()
                            .FirstOrDefault
                            (
                                interfaceType =>
                                    interfaceType.IsGenericType
                                    &&
                                    interfaceType
                                        .GetGenericTypeDefinition()
                                        ==
                                    typeof
                                    (
                                        IEntityTypeConfiguration<>
                                    )
                            );


                //===================================================
                // Configuration Interface Not Found
                //===================================================

                if
                (
                    configurationInterface
                    ==
                    null
                )
                {
                    return
                        false;
                }


                //===================================================
                // Resolve Entity Type
                //===================================================

                Type
                    entityType =
                        configurationInterface
                            .GetGenericArguments()
                            [0];


                //===================================================
                // Apply Only Registered Entity Configuration
                //===================================================

                return
                    modelBuilder.Model
                        .FindEntityType
                        (
                            entityType
                        )
                    !=
                    null;
            }
        );
    }
}