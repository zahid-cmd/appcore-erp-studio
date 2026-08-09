//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.InfrastructureControl.DevelopmentManagement;

//===============================================================
// Menu Synchronization Configuration
//===============================================================

public class MenuSynchronizationConfiguration
    : IEntityTypeConfiguration<MenuSynchronization>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<MenuSynchronization> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable
        (
            "INF_MenuSynchronization"
        );


        builder.HasKey
        (
            x => x.Id
        );


        //=======================================================
        // Navigation
        //=======================================================

        builder.Property(x => x.ModuleCode)
            .HasMaxLength(20)
            .IsRequired();


        builder.Property(x => x.ModuleName)
            .HasMaxLength(200)
            .IsRequired();


        builder.Property(x => x.MenuCode)
            .HasMaxLength(20)
            .IsRequired();


        builder.Property(x => x.MenuName)
            .HasMaxLength(200)
            .IsRequired();


        builder.Property(x => x.SynchronizationType)
            .HasMaxLength(20)
            .IsRequired();


        builder.HasIndex
        (
            x => new
            {
                x.MenuId,
                x.SynchronizationType
            }
        )
        .IsUnique();


        //=======================================================
        // Frontend Target Location
        //=======================================================

        builder.Property(x => x.FrontendSolution)
            .HasMaxLength(200);


        builder.Property(x => x.FrontendProject)
            .HasMaxLength(200);


        builder.Property(x => x.FrontendSourceFolder)
            .HasMaxLength(300);


        builder.Property(x => x.FrontendFeatureFolder)
            .HasMaxLength(300);


        //=======================================================
        // Frontend Menu Structure
        //=======================================================

        builder.Property(x => x.FrontendMenuFolder)
            .HasMaxLength(300);


        builder.Property(x => x.FrontendModelsFolder)
            .HasMaxLength(300);


        builder.Property(x => x.FrontendServicesFolder)
            .HasMaxLength(300);


        builder.Property(x => x.FrontendPagesFolder)
            .HasMaxLength(300);


        builder.Property(x => x.FrontendRoutesFolder)
            .HasMaxLength(300);


        //=======================================================
        // Frontend Route Files
        //=======================================================

        builder.Property(x => x.FrontendMenuRouteFile)
            .HasMaxLength(300);


        builder.Property(x => x.FrontendModuleRouteFile)
            .HasMaxLength(300);


        builder.Property(x => x.FrontendApplicationRouteFile)
            .HasMaxLength(300);


        //=======================================================
        // Backend Target Location
        //=======================================================

        builder.Property(x => x.BackendSolution)
            .HasMaxLength(200);


        builder.Property(x => x.BackendApplicationProject)
            .HasMaxLength(200);


        builder.Property(x => x.BackendDomainProject)
            .HasMaxLength(200);


        builder.Property(x => x.BackendInfrastructureProject)
            .HasMaxLength(200);


        //=======================================================
        // Backend Menu Structure
        //=======================================================

        builder.Property(x => x.BackendControllerFolder)
            .HasMaxLength(300);


        builder.Property(x => x.BackendApplicationFolder)
            .HasMaxLength(300);


        builder.Property(x => x.BackendDomainFolder)
            .HasMaxLength(300);


        builder.Property(x => x.BackendRepositoryFolder)
            .HasMaxLength(300);


        builder.Property(x => x.BackendConfigurationFolder)
            .HasMaxLength(300);


        //=======================================================
        // Synchronization
        //=======================================================

        builder.Property(x => x.Status)
            .HasMaxLength(30)
            .IsRequired();


        builder.Property(x => x.LastSynchronizationResult)
            .HasMaxLength(100);


        builder.Property(x => x.LastSynchronizedBy);


        builder.Property(x => x.LastSynchronizedDate);


        //=======================================================
        // Configuration
        //=======================================================

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);
    }
}