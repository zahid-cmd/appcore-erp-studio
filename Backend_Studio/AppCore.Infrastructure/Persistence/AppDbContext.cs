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





    // AUTO-BEGIN : AccountGroup

    public DbSet<AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup>
    AccountGroups
    {
    get;
    set;
    } = null!;

    // AUTO-END : AccountGroup

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