//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;
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

    public DbSet<NavigationModule> NavigationModules { get; set; } = null!;

    public DbSet<NavigationMenu> NavigationMenus { get; set; } = null!;

    public DbSet<NavigationSubmenu> NavigationSubmenus { get; set; } = null!;

    public DbSet<NavigationActivity> NavigationActivities { get; set; } = null!;

    public DbSet<MasterActivity> MasterActivities { get; set; } = null!;

    //===========================================================
    // Development Management
    //===========================================================

    public DbSet<ProjectSynchronization> ProjectSynchronizations { get; set; } = null!;

    public DbSet<ModuleSynchronization> ModuleSynchronizations { get; set; } = null!;

    //===========================================================
    // AUTO REGISTER DBSETS
    //===========================================================

    // public DbSet<Settings> Settingss { get; set; } = null!;


    //===========================================================
    // Human Resource Setup
    //===========================================================

    public DbSet<Department> Departments { get; set; } = null!;

    public DbSet<Designation> Designations { get; set; } = null!;

    //===========================================================
    // Security & Permission
    //===========================================================

    public DbSet<RoleProfile> RoleProfiles { get; set; } = null!;

    public DbSet<ActivityAssignment> ActivityAssignments { get; set; } = null!;

    public DbSet<ActivityAssignmentDetail> ActivityAssignmentDetails { get; set; } = null!;

    public DbSet<ActivityAssignmentPermission> ActivityAssignmentPermissions { get; set; } = null!;

    //===========================================================
    // Common
    //===========================================================

    public DbSet<ActivityHistory> ActivityHistories { get; set; } = null!;

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