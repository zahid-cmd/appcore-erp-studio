//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

using AppCore.Domain.InfrastructureControl.DevelopmentManagement;

using AppCore.Domain.Entities.HumanResource.HumanResourceSetup;

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence;


//===============================================================
// Application Database Context
//===============================================================

public class AppDbContext : DbContext
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
    // Human Resource Setup
    //===========================================================

    public DbSet<Department>
        Departments
        {
            get;
            set;
        } = null!;


    public DbSet<Designation>
        Designations
        {
            get;
            set;
        } = null!;


    //===========================================================
    // Security & Permission
    //===========================================================

    public DbSet<RoleProfile>
        RoleProfiles
        {
            get;
            set;
        } = null!;


    public DbSet<ActivityAssignment>
        ActivityAssignments
        {
            get;
            set;
        } = null!;


    public DbSet<ActivityAssignmentDetail>
        ActivityAssignmentDetails
        {
            get;
            set;
        } = null!;


    public DbSet<ActivityAssignmentPermission>
        ActivityAssignmentPermissions
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

    // AUTO-BEGIN : AccountGroup

    //===========================================================
    // AccountGroup
    //===========================================================

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup>
    AccountGroups
    {
    get;
    set;
    } = null!;


    // AUTO-END : AccountGroup


    // AUTO-BEGIN : Company

    //===========================================================
    // Company
    //===========================================================

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Company>
    Companys
    {
    get;
    set;
    } = null!;


    // AUTO-END : Company


    // AUTO-BEGIN : Branch

    //===========================================================
    // Branch
    //===========================================================

    public DbSet<AppCore.Domain.Entities.Settings.GeneralSettings.Branch>
    Branchs
    {
    get;
    set;
    } = null!;


    // AUTO-END : Branch


    

    // AUTO-BEGIN : AccountClass

    //===========================================================
    // AccountClass
    //===========================================================

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.AccountClass>
    AccountClasss
    {
    get;
    set;
    } = null!;


    // AUTO-END : AccountClass


    

    

    

    

    

    

    

    

    
    //===========================================================

    // AUTO-BEGIN blocks generated by the Backend Registration Engine
    // are inserted here.
    

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
        // Apply Entity Configurations
        //=======================================================

        modelBuilder.ApplyConfigurationsFromAssembly
        (
            typeof(AppDbContext).Assembly
        );
    }

}