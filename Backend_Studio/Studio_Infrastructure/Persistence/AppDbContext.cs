//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;


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

    public AppDbContext(DbContextOptions<AppDbContext> options)
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
    // Human Resource Setup
    //===========================================================


    //===========================================================
    // Security & Permission
    //===========================================================


    //===========================================================
    // Common
    //===========================================================

    public DbSet<ActivityHistory> ActivityHistories { get; set; } = null!;

    //===========================================================
    // Configure Entity Models
    //===========================================================

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //=======================================================
        // Apply Entity Configurations
        //=======================================================

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}