//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

using AppCore.Domain.InfrastructureControl.DevelopmentManagement;

using AppCore.Domain.Platform.Authentication;

using AppCore.Domain.Platform.Accounting;


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
    // Page Cloning
    //===========================================================

    public DbSet<PageCloning>
        PageClonings
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
    // Authentication
    //===========================================================

    public DbSet<UserCredential>
        UserCredentials
        {
            get;
            set;
        } = null!;


    public DbSet<PasswordResetVerification>
        PasswordResetVerifications
        {
            get;
            set;
        } = null!;


    //===========================================================
    // Platform Accounting (voucher foundation)
    //
    // Shared by every voucher (RV / PV / JV / FT) and every
    // reconciliation (RRV / RRP).
    //===========================================================

    // Voucher number counters (prefix + branch + year + month)
    public DbSet<VoucherSequences>
        VoucherSequenceRows
        {
            get;
            set;
        } = null!;


    // Posted debit / credit lines of every voucher type
    public DbSet<VoucherEntries>
        VoucherEntryRows
        {
            get;
            set;
        } = null!;


    //===========================================================
    // AUTO REGISTER DBSETS
    //===========================================================

    // AUTO-BEGIN : AUTO REGISTER DBSETS




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














    // AUTO-BEGIN : Dashboards

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.Dashboards>
    Dashboardss
    {
    get;
    set;
    } = null!;

    // AUTO-END : Dashboards



    // AUTO-BEGIN : DefaultDBComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.DashboardComponents.DefaultDBComponents>
    DefaultDBComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : DefaultDBComponents

    // AUTO-BEGIN : RoleBasedDBComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.DashboardComponents.RoleBasedDBComponents>
    RoleBasedDBComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : RoleBasedDBComponents



    // AUTO-BEGIN : WidgetConfiguration

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.WidgetConfiguration>
    WidgetConfigurations
    {
    get;
    set;
    } = null!;

    // AUTO-END : WidgetConfiguration

    // AUTO-BEGIN : Company

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Company>
    Companys
    {
    get;
    set;
    } = null!;

    // AUTO-END : Company



    // AUTO-BEGIN : CoreComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.LoginComponents.CoreComponents>
    CoreComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : CoreComponents

    // AUTO-BEGIN : SubOrdinateComponents

    public DbSet<AppCore.Domain.Entities.InfrastructureControl.LoginComponents.SubOrdinateComponents>
    SubOrdinateComponentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : SubOrdinateComponents





    // AUTO-BEGIN : Wings

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Wings>
    Wingss
    {
    get;
    set;
    } = null!;

    // AUTO-END : Wings




    // AUTO-BEGIN : Branches

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Branches>
    Branchess
    {
    get;
    set;
    } = null!;

    // AUTO-END : Branches

    // AUTO-BEGIN : Warehouses

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses>
    Warehousess
    {
    get;
    set;
    } = null!;

    // AUTO-END : Warehouses

    // AUTO-BEGIN : BranchAssignment

    public DbSet<AppCore.Domain.Entities.SecurityPermission.UserManagement.BranchAssignment>
    BranchAssignments
    {
    get;
    set;
    } = null!;

    // AUTO-END : BranchAssignment

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








    // AUTO-BEGIN : AccountSubGroup

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup>
    AccountSubGroups
    {
    get;
    set;
    } = null!;

    // AUTO-END : AccountSubGroup


    // AUTO-BEGIN : GeneralLedgers

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers>
    GeneralLedgerss
    {
    get;
    set;
    } = null!;

    // AUTO-END : GeneralLedgers







    // AUTO-BEGIN : CashAccounts

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts>
    CashAccountss
    {
    get;
    set;
    } = null!;

    // AUTO-END : CashAccounts


    // AUTO-BEGIN : BankSetup

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.BankSetup>
    BankSetups
    {
    get;
    set;
    } = null!;

    // AUTO-END : BankSetup








    // AUTO-BEGIN : CardSetup

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.CardSetup>
    CardSetups
    {
    get;
    set;
    } = null!;

    // AUTO-END : CardSetup




    // AUTO-BEGIN : FinancialYears

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.FinancialYears>
    FinancialYearss
    {
    get;
    set;
    } = null!;

    // AUTO-END : FinancialYears

    // AUTO-BEGIN : SystemConfigurations

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations>
    SystemConfigurationss
    {
    get;
    set;
    } = null!;

    // AUTO-END : SystemConfigurations




    // AUTO-BEGIN : ColorManagement

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement>
    ColorManagements
    {
    get;
    set;
    } = null!;

    // AUTO-END : ColorManagement

    // AUTO-BEGIN : BankAccounts

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts>
    BankAccountss
    {
    get;
    set;
    } = null!;

    // AUTO-END : BankAccounts

    // AUTO-BEGIN : MFSAccounts

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.MFSAccounts>
    MFSAccountss
    {
    get;
    set;
    } = null!;

    // AUTO-END : MFSAccounts

    // AUTO-BEGIN : POSAccounts

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.POSAccounts>
    POSAccountss
    {
    get;
    set;
    } = null!;

    // AUTO-END : POSAccounts

    // AUTO-BEGIN : CardCharges

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.CardCharges>
    CardChargess
    {
    get;
    set;
    } = null!;

    // AUTO-END : CardCharges


    // AUTO-BEGIN : ProductSubCategory

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory>
    ProductSubCategorys
    {
    get;
    set;
    } = null!;

    // AUTO-END : ProductSubCategory



    // AUTO-BEGIN : BrandManagement

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement>
    BrandManagements
    {
    get;
    set;
    } = null!;

    // AUTO-END : BrandManagement

    // AUTO-BEGIN : ProductCategory

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory>
    ProductCategorys
    {
    get;
    set;
    } = null!;

    // AUTO-END : ProductCategory

    // AUTO-BEGIN : MotorBikes

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes>
    MotorBikess
    {
    get;
    set;
    } = null!;

    // AUTO-END : MotorBikes



    // AUTO-BEGIN : SpareParts

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.SpareParts>
    SparePartss
    {
    get;
    set;
    } = null!;

    // AUTO-END : SpareParts

    // AUTO-BEGIN : RackManagement

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.RackManagement>
    RackManagements
    {
    get;
    set;
    } = null!;

    // AUTO-END : RackManagement

    // AUTO-BEGIN : Accessories

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.Accessories>
    Accessoriess
    {
    get;
    set;
    } = null!;

    // AUTO-END : Accessories

    // AUTO-BEGIN : BusinessConfiguration

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.BusinessConfiguration>
    BusinessConfigurations
    {
    get;
    set;
    } = null!;

    // AUTO-END : BusinessConfiguration


    // AUTO-BEGIN : ServiceCategory

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory>
    ServiceCategorys
    {
    get;
    set;
    } = null!;

    // AUTO-END : ServiceCategory


    // AUTO-BEGIN : ServicePolicy

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicy>
    ServicePolicys
    {
    get;
    set;
    } = null!;

    // AUTO-END : ServicePolicy


    // AUTO-BEGIN : ServiceSubCategory

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory>
    ServiceSubCategorys
    {
    get;
    set;
    } = null!;

    // AUTO-END : ServiceSubCategory


    // AUTO-BEGIN : ScheduledServices

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.ScheduledServices>
    ScheduledServicess
    {
    get;
    set;
    } = null!;

    // AUTO-END : ScheduledServices


    // AUTO-BEGIN : LaborChart

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.LaborChart>
    LaborCharts
    {
    get;
    set;
    } = null!;

    // AUTO-END : LaborChart


    // AUTO-BEGIN : CustomizedServices

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.CustomizedServices>
    CustomizedServicess
    {
    get;
    set;
    } = null!;

    // AUTO-END : CustomizedServices

    // AUTO-BEGIN : MembershipServices

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.MembershipServices>
    MembershipServicess
    {
    get;
    set;
    } = null!;

    // AUTO-END : MembershipServices



    // AUTO-BEGIN : Locations

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Locations>
    Locationss
    {
    get;
    set;
    } = null!;

    // AUTO-END : Locations





    // AUTO-BEGIN : CustomerProfiles

    public DbSet<AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles>
    CustomerProfiless
    {
    get;
    set;
    } = null!;

    // AUTO-END : CustomerProfiles


    // AUTO-BEGIN : SupplierProfiles

    public DbSet<AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles>
    SupplierProfiless
    {
    get;
    set;
    } = null!;

    // AUTO-END : SupplierProfiles

    // AUTO-BEGIN : MembershipCards

    public DbSet<AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards>
    MembershipCardss
    {
    get;
    set;
    } = null!;

    // AUTO-END : MembershipCards

    // AUTO-BEGIN : MembershipPolicies

    public DbSet<AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipPolicies>
    MembershipPoliciess
    {
    get;
    set;
    } = null!;

    // AUTO-END : MembershipPolicies


    // AUTO-BEGIN : MembershipStatus

    public DbSet<AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipStatus>
    MembershipStatuss
    {
    get;
    set;
    } = null!;

    // AUTO-END : MembershipStatus




    // AUTO-BEGIN : EmiAccounts

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.EmiAccounts>
    EmiAccountss
    {
    get;
    set;
    } = null!;

    // AUTO-END : EmiAccounts

    // AUTO-BEGIN : FundTransfer

    public DbSet<AppCore.Domain.Entities.AccountsFinance.VoucherManagement.FundTransfer>
    FundTransfers
    {
    get;
    set;
    } = null!;

    // AUTO-END : FundTransfer

    // AUTO-BEGIN : JournalVoucher

    public DbSet<AppCore.Domain.Entities.AccountsFinance.VoucherManagement.JournalVoucher>
    JournalVouchers
    {
    get;
    set;
    } = null!;

    // AUTO-END : JournalVoucher

    // AUTO-BEGIN : ReceiptVoucher

    public DbSet<AppCore.Domain.Entities.AccountsFinance.VoucherManagement.ReceiptVoucher>
    ReceiptVouchers
    {
    get;
    set;
    } = null!;

    // AUTO-END : ReceiptVoucher

    // AUTO-BEGIN : CheckReconciliations

    public DbSet<AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.CheckReconciliations>
    CheckReconciliationss
    {
    get;
    set;
    } = null!;

    // AUTO-END : CheckReconciliations

    // AUTO-BEGIN : EmiReconciliations

    public DbSet<AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.EmiReconciliations>
    EmiReconciliationss
    {
    get;
    set;
    } = null!;

    // AUTO-END : EmiReconciliations

    // AUTO-BEGIN : MfsReconciliations

    public DbSet<AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.MfsReconciliations>
    MfsReconciliationss
    {
    get;
    set;
    } = null!;

    // AUTO-END : MfsReconciliations

    // AUTO-BEGIN : PosReconciliations

    public DbSet<AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.PosReconciliations>
    PosReconciliationss
    {
    get;
    set;
    } = null!;

    // AUTO-END : PosReconciliations

    // AUTO-BEGIN : EmiReimbursementSchemes

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.EmiReimbursementSchemes>
    EmiReimbursementSchemess
    {
    get;
    set;
    } = null!;

    // AUTO-END : EmiReimbursementSchemes

    // AUTO-END : AUTO REGISTER DBSETS


    //===========================================================
    // MANUAL DBSETS
    //
    // Entities without a page of their own (link tables), so
    // Code Synchronization does not register them. Keep this
    // block OUTSIDE the AUTO-BEGIN / AUTO-END markers.
    //===========================================================

    // Spare Part ↔ Warehouse / Rack / Shelf (one row per warehouse)
    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations>
    SparePartLocationRows
    {
    get;
    set;
    } = null!;

    // Accessory ↔ Warehouse / Rack / Shelf (one row per warehouse)
    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations>
    AccessoryLocationRows
    {
    get;
    set;
    } = null!;

    // Wing → core business line(s) (Business Configuration page)
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WingBusinessLines>
    WingBusinessLineRows
    {
    get;
    set;
    } = null!;

    // Service Policy → its ordered free / paid services (Service Schedule)
    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicySchedule>
    ServicePolicyScheduleRows
    {
    get;
    set;
    } = null!;

    // Membership → its free service windows (Membership Status page)
    public DbSet<AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipServiceWindows>
    MembershipServiceWindowRows
    {
    get;
    set;
    } = null!;

    // Receipt Voucher → what is received for (master lines)
    public DbSet<AppCore.Domain.Entities.AccountsFinance.VoucherManagement.ReceiptVoucherLines>
    ReceiptVoucherLineRows
    {
    get;
    set;
    } = null!;

    // Receipt Voucher → how it is received (Payment Desk lines)
    public DbSet<AppCore.Domain.Entities.AccountsFinance.VoucherManagement.ReceiptVoucherPayments>
    ReceiptVoucherPaymentRows
    {
    get;
    set;
    } = null!;


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