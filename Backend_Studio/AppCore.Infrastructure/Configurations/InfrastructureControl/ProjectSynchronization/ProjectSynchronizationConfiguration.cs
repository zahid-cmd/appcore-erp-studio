//===============================================================
// Imports
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using ProjectSynchronizationEntity =
    AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement.ProjectSynchronization;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.ProjectSynchronization;


//===============================================================
// Project Synchronization Configuration
//===============================================================

public class ProjectSynchronizationConfiguration
    : IEntityTypeConfiguration<ProjectSynchronizationEntity>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<ProjectSynchronizationEntity> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "ProjectSynchronizations");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x =>
            x.Id);

        builder.Property(x =>
            x.Id)
            .ValueGeneratedOnAdd();


        //=======================================================
        // Synchronization
        //=======================================================

        builder.Property(x =>
            x.SynchronizationLevel)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x =>
            x.SynchronizationTarget)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x =>
            x.FrontendStatus)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x =>
            x.BackendStatus)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x =>
            x.Remarks)
            .HasMaxLength(1000);


        //=======================================================
        // Frontend Configuration
        //=======================================================

        builder.Property(x =>
            x.FrontendSolution)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendProject)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendSourceFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendFeatureFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendModuleFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendModelFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendPagesFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendRoutesFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendServicesFolder)
            .HasMaxLength(500);


        //=======================================================
        // Frontend Application Registration
        //=======================================================

        builder.Property(x =>
            x.FrontendModuleRouteFile)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendParentRouteFile)
            .HasMaxLength(500);

        builder.Property(x =>
            x.FrontendRoutePath)
            .HasMaxLength(500);


        //=======================================================
        // Backend Configuration
        //=======================================================

        builder.Property(x =>
            x.BackendApiProject)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendApplicationProject)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendDomainProject)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendInfrastructureProject)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendControllerFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendDtoFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendInterfaceFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendEntityFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendRepositoryFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendConfigurationFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendDependencyInjectionFile)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendDbContextFile)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendProgramFile)
            .HasMaxLength(500);

        builder.Property(x =>
            x.BackendMigrationFolder)
            .HasMaxLength(500);

        builder.Property(x =>
            x.DatabaseProvider)
            .HasMaxLength(100);


        //=======================================================
        // Navigation References
        //=======================================================

        builder.Property(x =>
            x.ModuleId);

        builder.Property(x =>
            x.MenuId);

        builder.Property(x =>
            x.SubmenuId);


        //=======================================================
        // Last Synchronization
        //=======================================================

        builder.Property(x =>
            x.LastSynchronizedBy);

        builder.Property(x =>
            x.LastSynchronizedDate);


        //=======================================================
        // Audit
        //=======================================================

        builder.Property(x =>
            x.CreatedBy)
            .IsRequired();

        builder.Property(x =>
            x.CreatedDate)
            .IsRequired();

        builder.Property(x =>
            x.ModifiedBy);

        builder.Property(x =>
            x.ModifiedDate);

        builder.Property(x =>
            x.DeletedBy);

        builder.Property(x =>
            x.DeletedDate);

        builder.Property(x =>
            x.IsDeleted)
            .HasDefaultValue(false);


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(x =>
            x.ModuleId);

        builder.HasIndex(x =>
            x.MenuId);

        builder.HasIndex(x =>
            x.SubmenuId);

        builder.HasIndex(x =>
            x.SynchronizationTarget);

        builder.HasIndex(x =>
            x.FrontendStatus);

        builder.HasIndex(x =>
            x.BackendStatus);

        builder.HasIndex(x =>
            x.IsDeleted);


        builder.HasIndex(
            x => new
            {
                x.SynchronizationLevel,
                x.ModuleId,
                x.MenuId,
                x.SubmenuId,
                x.SynchronizationTarget
            })
            .IsUnique();
    }
}