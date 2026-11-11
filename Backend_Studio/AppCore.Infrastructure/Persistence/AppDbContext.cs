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


    // Page activities : the pages each one is used on (by code).
    // Table created by MasterActivities_PageActivities.sql.

    public DbSet<MasterActivityPages>
        MasterActivityPageRows
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
    // Platform Shell (top bar, sidebar footer, app footer)
    //
    // Manual, OUTSIDE the AUTO blocks : no page of its own, so
    // Code Synchronization must not own it.
    //===========================================================

    // Favorite pages per user (sidebar star / Favorites panel).
    // Table created by UserFavorites.sql.
    public DbSet<AppCore.Domain.Platform.Shell.UserFavorites>
        UserFavoriteRows
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

    // System Configuration Requests (manual) : critical changes
    // waiting for approval. Table created by
    // SystemConfigurations_Redesign.sql.

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurationRequests>
    SystemConfigurationRequests
    {
    get;
    set;
    } = null!;




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

    // AUTO-BEGIN : PurchaseVat

    public DbSet<AppCore.Domain.Entities.VatManagement.VatSetup.PurchaseVat>
    PurchaseVats
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseVat

    // AUTO-BEGIN : SalesVat

    public DbSet<AppCore.Domain.Entities.VatManagement.VatSetup.SalesVat>
    SalesVats
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesVat

    // AUTO-BEGIN : PurchaseOrdersMb

    public DbSet<AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseOrdersMb>
    PurchaseOrdersMbs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseOrdersMb

    // AUTO-BEGIN : PurchaseAdjustmentsMb

    public DbSet<AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAdjustmentsMb>
    PurchaseAdjustmentsMbs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseAdjustmentsMb

    // AUTO-BEGIN : PurchaseReturnsMb

    public DbSet<AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseReturnsMb>
    PurchaseReturnsMbs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseReturnsMb

    // AUTO-BEGIN : PurchasesMb

    public DbSet<AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchasesMb>
    PurchasesMbs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchasesMb

    // AUTO-BEGIN : PurchaseOrdersAc

    public DbSet<AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchaseOrdersAc>
    PurchaseOrdersAcs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseOrdersAc

    // AUTO-BEGIN : PurchaseOrdersSp

    public DbSet<AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchaseOrdersSp>
    PurchaseOrdersSps
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseOrdersSp

    // AUTO-BEGIN : ProductPricing

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.ProductPricing>
    ProductPricings
    {
    get;
    set;
    } = null!;

    // AUTO-END : ProductPricing

    // AUTO-BEGIN : PurchasesAc

    public DbSet<AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchasesAc>
    PurchasesAcs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchasesAc

    // AUTO-BEGIN : PurchasesSp

    public DbSet<AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchasesSp>
    PurchasesSps
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchasesSp

    // AUTO-BEGIN : PurchaseAdjustmentsAc

    public DbSet<AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchaseAdjustmentsAc>
    PurchaseAdjustmentsAcs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseAdjustmentsAc

    // AUTO-BEGIN : PurchaseReturnsAc

    public DbSet<AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchaseReturnsAc>
    PurchaseReturnsAcs
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseReturnsAc

    // AUTO-BEGIN : PurchaseAdjustmentsSp

    public DbSet<AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchaseAdjustmentsSp>
    PurchaseAdjustmentsSps
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseAdjustmentsSp

    // AUTO-BEGIN : PurchaseReturnsSp

    public DbSet<AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchaseReturnsSp>
    PurchaseReturnsSps
    {
    get;
    set;
    } = null!;

    // AUTO-END : PurchaseReturnsSp

    // AUTO-BEGIN : AccessoriesReceiving

    public DbSet<AppCore.Domain.Entities.InventoryManagement.ProductReceiving.AccessoriesReceiving>
    AccessoriesReceivings
    {
    get;
    set;
    } = null!;

    // AUTO-END : AccessoriesReceiving

    // AUTO-BEGIN : MotorBikeReceiving

    public DbSet<AppCore.Domain.Entities.InventoryManagement.ProductReceiving.MotorBikeReceiving>
    MotorBikeReceivings
    {
    get;
    set;
    } = null!;

    // AUTO-END : MotorBikeReceiving

    // AUTO-BEGIN : SparePartsLubricantsReceiving

    public DbSet<AppCore.Domain.Entities.InventoryManagement.ProductReceiving.SparePartsLubricantsReceiving>
    SparePartsLubricantsReceivings
    {
    get;
    set;
    } = null!;

    // AUTO-END : SparePartsLubricantsReceiving

    // AUTO-BEGIN : OpeningStock

    public DbSet<AppCore.Domain.Entities.InventoryManagement.StoreSetup.OpeningStock>
    OpeningStocks
    {
    get;
    set;
    } = null!;

    // AUTO-END : OpeningStock

    // AUTO-BEGIN : PriceAdjustment

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustment>
    PriceAdjustments
    {
    get;
    set;
    } = null!;

    // AUTO-END : PriceAdjustment

    // AUTO-BEGIN : ProductTransfer

    public DbSet<AppCore.Domain.Entities.InventoryManagement.StockMovement.ProductTransfer>
    ProductTransfers
    {
    get;
    set;
    } = null!;

    // AUTO-END : ProductTransfer

    // AUTO-BEGIN : MassStoring

    public DbSet<AppCore.Domain.Entities.InventoryManagement.StockMovement.MassStoring>
    MassStorings
    {
    get;
    set;
    } = null!;

    // AUTO-END : MassStoring

    // AUTO-BEGIN : SalesEnquiries

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.SalesEnquiries>
    SalesEnquiriess
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesEnquiries

    // AUTO-BEGIN : ServiceEnquiries

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries>
    ServiceEnquiriess
    {
    get;
    set;
    } = null!;

    // AUTO-END : ServiceEnquiries

    // AUTO-BEGIN : SalesInvoicesSp

    public DbSet<AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesInvoicesSp>
    SalesInvoicesSps
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesInvoicesSp

    // AUTO-BEGIN : BikeModels

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.BikeModels>
    BikeModelss
    {
    get;
    set;
    } = null!;

    // AUTO-END : BikeModels

    // AUTO-BEGIN : ServiceAppointments

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.ServiceAppointments>
    ServiceAppointmentss
    {
    get;
    set;
    } = null!;

    // AUTO-END : ServiceAppointments

    // AUTO-BEGIN : TestRides

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.TestRides>
    TestRidess
    {
    get;
    set;
    } = null!;

    // AUTO-END : TestRides

    // AUTO-BEGIN : SalesInvoicesAc

    public DbSet<AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesInvoicesAc>
    SalesInvoicesAcs
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesInvoicesAc

    // AUTO-BEGIN : SalesQuotationsAc

    public DbSet<AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesQuotationsAc>
    SalesQuotationsAcs
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesQuotationsAc

    // AUTO-BEGIN : SalesQuotationsSp

    public DbSet<AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesQuotationsSp>
    SalesQuotationsSps
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesQuotationsSp

    // AUTO-BEGIN : SalesReturnsSp

    public DbSet<AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesReturnsSp>
    SalesReturnsSps
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesReturnsSp

    // AUTO-BEGIN : SalesReturnsAc

    public DbSet<AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesReturnsAc>
    SalesReturnsAcs
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesReturnsAc

    // AUTO-BEGIN : BikeAccessorySchemes

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemes>
    BikeAccessorySchemess
    {
    get;
    set;
    } = null!;

    // AUTO-END : BikeAccessorySchemes

    // AUTO-BEGIN : BikeDeliveries

    public DbSet<AppCore.Domain.Entities.SalesOperations.MotorBikeSales.BikeDeliveries>
    BikeDeliveriess
    {
    get;
    set;
    } = null!;

    // AUTO-END : BikeDeliveries

    // AUTO-BEGIN : SalesInvoicesMb

    public DbSet<AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesInvoicesMb>
    SalesInvoicesMbs
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesInvoicesMb

    // AUTO-BEGIN : SalesQuotationsMb

    public DbSet<AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesQuotationsMb>
    SalesQuotationsMbs
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesQuotationsMb

    // AUTO-BEGIN : SalesReturnsMb

    public DbSet<AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesReturnsMb>
    SalesReturnsMbs
    {
    get;
    set;
    } = null!;

    // AUTO-END : SalesReturnsMb

    // AUTO-BEGIN : MotorBikeSpecifications

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecifications>
    MotorBikeSpecificationss
    {
    get;
    set;
    } = null!;

    // AUTO-END : MotorBikeSpecifications

    // AUTO-BEGIN : PdiTemplates

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.PdiTemplates>
    PdiTemplatess
    {
    get;
    set;
    } = null!;

    // AUTO-END : PdiTemplates

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

    // Spare Part ↔ other sub categories (models) it also fits
    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.SparePartFitments>
    SparePartFitmentRows
    {
    get;
    set;
    } = null!;

    // Bike Accessory Schemes : models and items (MANUAL : the head
    // BikeAccessorySchemes is in the sync's AUTO block)
    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeModels>
    BikeAccessorySchemeModelRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeItems>
    BikeAccessorySchemeItemRows
    {
    get;
    set;
    } = null!;

    // Motor Bike Specifications : technical rows (MANUAL : the head
    // MotorBikeSpecifications is in the sync's AUTO block)
    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecificationItems>
    MotorBikeSpecificationItemRows
    {
    get;
    set;
    } = null!;

    // MB Purchases : free accessories due from the supplier and
    // received on Motor Bike Receiving (MANUAL : no page of its own)
    public DbSet<AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAccessoryDues>
    PurchaseAccessoryDueRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAccessoryReceipts>
    PurchaseAccessoryReceiptRows
    {
    get;
    set;
    } = null!;

    // Free accessories to take in with the purchase (draft;
    // Products Received on Purchase ON)
    public DbSet<AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAccessoryTakes>
    PurchaseAccessoryTakeRows
    {
    get;
    set;
    } = null!;

    // Accessory ↔ other sub categories (models) it also fits
    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.AccessoryFitments>
    AccessoryFitmentRows
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

    // Posting Setup page : ledger per posting purpose (custom page)
    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.PostingSetups>
    PostingSetupRows
    {
    get;
    set;
    } = null!;

    // Posting Setup page : ledger changes with the reason
    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.PostingSetupHistory>
    PostingSetupHistoryRows
    {
    get;
    set;
    } = null!;

    // Stock ledger : batches (exact cost), movements, issue
    // allocations, item-level VAT register
    public DbSet<AppCore.Domain.Platform.Inventory.StockBatches>
    StockBatchRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Platform.Inventory.StockMovements>
    StockMovementRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Platform.Inventory.StockAllocations>
    StockAllocationRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Platform.Inventory.VatRegister>
    VatRegisterRows
    {
    get;
    set;
    } = null!;

    // Product Price Index : the declared MRP of every product
    public DbSet<AppCore.Domain.Platform.Inventory.ProductPriceIndex>
    ProductPriceIndexRows
    {
    get;
    set;
    } = null!;


    // Website Configuration page (custom page, General Settings) :
    // the one configuration row
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WebsiteConfigurations>
    WebsiteConfigurationRows
    {
    get;
    set;
    } = null!;

    // opening hours
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WebsiteOpeningHours>
    WebsiteOpeningHourRows
    {
    get;
    set;
    } = null!;

    // strip / why-us / service / FAQ lists
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WebsiteContentItems>
    WebsiteContentItemRows
    {
    get;
    set;
    } = null!;

    // brands shown, order, brand pages
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WebsiteBrands>
    WebsiteBrandRows
    {
    get;
    set;
    } = null!;

    // brands per branch
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WebsiteBranchBrands>
    WebsiteBranchBrandRows
    {
    get;
    set;
    } = null!;

    // warranty / terms / privacy parts
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WebsitePolicies>
    WebsitePolicyRows
    {
    get;
    set;
    } = null!;

    // policy sections
    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.WebsitePolicySections>
    WebsitePolicySectionRows
    {
    get;
    set;
    } = null!;

    // Feedback (topbar Feedback button; table "Feedbacks", made by
    // Database/Feedback_Setup.sql). Mapped in OnModelCreating
    // below (no configuration class)
    public DbSet<AppCore.Domain.Platform.Feedbacks.FeedbackEntry>
    Feedbacks
    {
    get;
    set;
    } = null!;

    // Team Chat (Database/Chat_Setup.sql). Mapped in
    // OnModelCreating below
    public DbSet<AppCore.Domain.Platform.Chat.ChatConversation>
    ChatConversations
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Platform.Chat.ChatMember>
    ChatMembers
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Platform.Chat.ChatMessage>
    ChatMessages
    {
    get;
    set;
    } = null!;

    // Barcode Management : print history (runs + lines). A new
    // table needs its DbSet : OnModelCreating applies only the
    // configurations of entities with a DbSet
    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.BarcodePrintRuns>
    BarcodePrintRunRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.BarcodePrintRunLines>
    BarcodePrintRunLineRows
    {
    get;
    set;
    } = null!;

    // Price Adjustment : products, batch lines, supplier groups and
    // releases (MANUAL : the head PriceAdjustments is in the sync's
    // AUTO block). A new table needs its DbSet

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustmentProducts>
    PriceAdjustmentProductRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustmentLines>
    PriceAdjustmentLineRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustmentSuppliers>
    PriceAdjustmentSupplierRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustmentReleases>
    PriceAdjustmentReleaseRows
    {
    get;
    set;
    } = null!;

    // Product Transfer : lines, batches taken, bikes (MANUAL : the
    // head ProductTransfers is in the sync's AUTO block)

    public DbSet<AppCore.Domain.Entities.InventoryManagement.StockMovement.ProductTransferLines>
    ProductTransferLineRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.InventoryManagement.StockMovement.ProductTransferBatches>
    ProductTransferBatchRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.InventoryManagement.StockMovement.ProductTransferUnits>
    ProductTransferUnitRows
    {
    get;
    set;
    } = null!;

    // Mass Storing : lines (MANUAL : the head MassStorings is in the
    // sync's AUTO block)

    public DbSet<AppCore.Domain.Entities.InventoryManagement.StockMovement.MassStoringLines>
    MassStoringLineRows
    {
    get;
    set;
    } = null!;

    // Storage Bins : zones, shelves (bins per shelf) and rack sub
    // categories of Rack Management (MANUAL : the head
    // RackManagements is in the sync's AUTO block)

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.RackZones>
    RackZoneRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.RackShelves>
    RackShelfRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.Settings.ProductSettings.RackSubCategories>
    RackSubCategoryRows
    {
    get;
    set;
    } = null!;

    // Registration Configuration : types, fees, costs, stage
    // timings (MANUAL : hand-written page, no Code Synchronization)

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.RegistrationControl.RegistrationTypes>
    RegistrationTypeRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.RegistrationControl.RegistrationFees>
    RegistrationFeeRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.RegistrationControl.RegistrationCosts>
    RegistrationCostRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.RegistrationControl.RegistrationStageTimings>
    RegistrationStageTimingRows
    {
    get;
    set;
    } = null!;

    // Customer File Configuration : name transfer rules, file
    // delivery rules, required documents (MANUAL : hand-written page)

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFileNameTransferRules>
    CustomerFileNameTransferRuleRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFileDeliveryRules>
    CustomerFileDeliveryRuleRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFileDocuments>
    CustomerFileDocumentRows
    {
    get;
    set;
    } = null!;

    // Customer Files : one file per chassis and its name
    // transfers (MANUAL : hand-written page)

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFiles>
    CustomerFileRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFileNameTransfers>
    CustomerFileNameTransferRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFileFees>
    CustomerFileFeeRows
    {
    get;
    set;
    } = null!;

    // Bookings (motor bikes) and their collections (MANUAL :
    // BookingsMB_Engine.sql, hand-written page)

    public DbSet<AppCore.Domain.Entities.SalesOperations.BookingManagement.Bookings>
    BookingRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.SalesOperations.BookingManagement.BookingCollections>
    BookingCollectionRows
    {
    get;
    set;
    } = null!;

    // Registration Profiles : one per chassis the dealer registers
    // (MANUAL : RegistrationOnSale_Engine.sql, hand-written page)

    public DbSet<AppCore.Domain.Entities.RegistrationManagement.RegistrationProcessing.RegistrationProfiles>
    RegistrationProfileRows
    {
    get;
    set;
    } = null!;

    // Warranty Configuration : warranty parts, policies,
    // coverages (MANUAL : hand-written page)

    public DbSet<AppCore.Domain.Entities.WarrantyManagement.WarrantyControl.WarrantyParts>
    WarrantyPartRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.WarrantyManagement.WarrantyControl.WarrantyPolicies>
    WarrantyPolicyRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.WarrantyManagement.WarrantyControl.WarrantyCoverages>
    WarrantyCoverageRows
    {
    get;
    set;
    } = null!;

    // Sales Warranty Records : made when a bike is delivered
    // (MANUAL : BikeDeliveries_Pdi_Engine.sql)

    public DbSet<AppCore.Domain.Entities.WarrantyManagement.WarrantyControl.SalesWarrantyRecords>
    SalesWarrantyRecordRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.WarrantyManagement.WarrantyControl.SalesWarrantyRecordParts>
    SalesWarrantyRecordPartRows
    {
    get;
    set;
    } = null!;

    // PDI Templates : models, sections, items (MANUAL : the head
    // PdiTemplates is in the sync's AUTO block)

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.PdiTemplateModels>
    PdiTemplateModelRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.PdiTemplateSections>
    PdiTemplateSectionRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.Settings.ServiceSettings.PdiTemplateItems>
    PdiTemplateItemRows
    {
    get;
    set;
    } = null!;

    // Bike Deliveries : the PDI sheet as filled (MANUAL : the head
    // BikeDeliveries is in the sync's AUTO block)

    public DbSet<AppCore.Domain.Entities.SalesOperations.MotorBikeSales.BikeDeliveryAnswers>
    BikeDeliveryAnswerRows
    {
    get;
    set;
    } = null!;

    // Enquiry Setup : the five lists of the Enquiry Setup page
    // (MANUAL : hand-written page, no Code Synchronization)

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups>
    EnquirySetupRows
    {
    get;
    set;
    } = null!;

    // Enquiry Contacts : the enquirer list kept from the Sales /
    // Service Enquiries forms (MANUAL : no page of its own)

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquiryContacts>
    EnquiryContactRows
    {
    get;
    set;
    } = null!;

    // Service Enquiry Lines : services / parts asked for on a
    // service enquiry (MANUAL : replaced with the enquiry)

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiryLines>
    ServiceEnquiryLineRows
    {
    get;
    set;
    } = null!;

    // Service Vehicles : bikes sold from our outlet, with their
    // service schedule (MANUAL : shown on Service Enquiries)

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceVehicles>
    ServiceVehicleRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceVehicleSchedules>
    ServiceVehicleScheduleRows
    {
    get;
    set;
    } = null!;

    // Sales Follow-ups : calls / visits logged on sales enquiries
    // (MANUAL : hand-written page, no Code Sync)

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.SalesFollowUps>
    SalesFollowUpRows
    {
    get;
    set;
    } = null!;

    // Service Follow-ups : calls / visits logged on service enquiries

    public DbSet<AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.ServiceFollowUps>
    ServiceFollowUpRows
    {
    get;
    set;
    } = null!;

    // Service Appointments and Test Rides (table SalesTestRides) :
    // their DbSets are the Code Sync AUTO blocks ServiceAppointmentss
    // and TestRidess (2026-11-06); the repositories use Set<T>().

    // Sales Invoices - SP : lines and Payment Desk rows (MANUAL : the
    // head SalesInvoicesSp is in the sync's AUTO block). A new table
    // needs its DbSet

    public DbSet<AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesInvoicesSpLines>
    SalesInvoicesSpLineRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesInvoicesSpPayments>
    SalesInvoicesSpPaymentRows
    {
    get;
    set;
    } = null!;

    // Sales Invoices - AC : lines and Payment Desk rows (MANUAL : the
    // head SalesInvoicesAc is in the sync's AUTO block)

    public DbSet<AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesInvoicesAcLines>
    SalesInvoicesAcLineRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesInvoicesAcPayments>
    SalesInvoicesAcPaymentRows
    {
    get;
    set;
    } = null!;

    // Sales Invoices - MB : lines (one bike each) and Payment Desk
    // rows (MANUAL : the head SalesInvoicesMb is in the sync's AUTO
    // block; without these the line / payment configurations are
    // skipped by the registered-only filter below)

    public DbSet<AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesInvoicesMbLines>
    SalesInvoicesMbLineRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesInvoicesMbPayments>
    SalesInvoicesMbPaymentRows
    {
    get;
    set;
    } = null!;

    // Product Pricing - Motor Bikes : price cards and their lines
    // (MANUAL : registers both, so ProductPricingMotorBikesConfiguration
    // is applied by the registered-only filter below)

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.ProductPricingMotorBikes>
    ProductPricingMotorBikesRows
    {
    get;
    set;
    } = null!;

    public DbSet<AppCore.Domain.Entities.InventoryManagement.PricingLabels.ProductPricingMotorBikeLines>
    ProductPricingMotorBikeLineRows
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


        //=======================================================
        // Feedback : table "Feedbacks", key FeedbackId
        //=======================================================

        modelBuilder.Entity<AppCore.Domain.Platform.Feedbacks.FeedbackEntry>
        (
            entity =>
            {
                entity.ToTable("Feedbacks");

                entity.HasKey(x => x.FeedbackId);

                entity.HasIndex(x => x.PublicId).IsUnique();
            }
        );


        //=======================================================
        // Team Chat : conversations, members, messages
        //=======================================================

        modelBuilder.Entity<AppCore.Domain.Platform.Chat.ChatConversation>
        (
            entity =>
            {
                entity.ToTable("ChatConversations");

                entity.HasKey(x => x.ChatConversationId);
            }
        );

        modelBuilder.Entity<AppCore.Domain.Platform.Chat.ChatMember>
        (
            entity =>
            {
                entity.ToTable("ChatMembers");

                entity.HasKey(x => x.ChatMemberId);
            }
        );

        modelBuilder.Entity<AppCore.Domain.Platform.Chat.ChatMessage>
        (
            entity =>
            {
                entity.ToTable("ChatMessages");

                entity.HasKey(x => x.ChatMessageId);
            }
        );
    }


    //===========================================================
    // English-only text (the database is Windows-1252)
    //
    // Text that Windows-1252 cannot hold (Bangla, emoji, "→" ...)
    // is refused before saving, with the field named, instead of
    // the database's 22P05 error. Controllers answer it as 400.
    //===========================================================

    private static readonly HashSet<char> Win1252Extra =
        new("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

    private static bool IsStorable(char c)
    {
        return c == '\t'
            || c == '\n'
            || c == '\r'
            || (c >= ' ' && c <= '~')
            || (c >= '\u00A0' && c <= '\u00FF')
            || Win1252Extra.Contains(c);
    }

    private void RefuseUnstorableText()
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Added && entry.State != EntityState.Modified)
            {
                continue;
            }

            foreach (var property in entry.Properties)
            {
                if (property.Metadata.ClrType != typeof(string)
                    || property.CurrentValue is not string text
                    || (entry.State == EntityState.Modified && !property.IsModified))
                {
                    continue;
                }

                foreach (char c in text)
                {
                    if (!IsStorable(c))
                    {
                        throw new InvalidOperationException(
                            $"\"{property.Metadata.Name}\" has letters that cannot be saved. Use English letters only (no Bangla, emoji or special symbols).");
                    }
                }
            }
        }
    }


    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        RefuseUnstorableText();

        return base.SaveChanges(acceptAllChangesOnSuccess);
    }


    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        RefuseUnstorableText();

        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }
}
