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
// Module Synchronization Configuration
//===============================================================

public class ModuleSynchronizationConfiguration
    : IEntityTypeConfiguration<ModuleSynchronization>
{
    public void Configure(
        EntityTypeBuilder<ModuleSynchronization> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable(
            "INF_ModuleSynchronization");

        builder.HasKey(
            x => x.Id);

        //===========================================================
        // Navigation
        //===========================================================

        builder.Property(x => x.ModuleCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.ModuleName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.SynchronizationType)
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(x => new
        {
            x.ModuleId,
            x.SynchronizationType
        })
        .IsUnique();

        //===========================================================
        // Frontend Target Location
        //===========================================================

        builder.Property(x => x.FrontendSolution)
            .HasMaxLength(200);

        builder.Property(x => x.FrontendProject)
            .HasMaxLength(200);

        builder.Property(x => x.FrontendSourceFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendFeatureFolder)
            .HasMaxLength(300);

        //===========================================================
        // Frontend Standard Module Structure
        //===========================================================

        builder.Property(x => x.FrontendModuleFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendModelFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendPagesFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendRoutesFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendServicesFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendModuleRouteFile)
            .HasMaxLength(300);

        //===========================================================
        // Frontend Application Registration
        //===========================================================

        builder.Property(x => x.FrontendApplicationRouteFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendRoutePath)
            .HasMaxLength(300);

        //===========================================================
        // Backend Target Location
        //===========================================================

        builder.Property(x => x.BackendSolution)
            .HasMaxLength(200);

        builder.Property(x => x.BackendApiProject)
            .HasMaxLength(200);

        builder.Property(x => x.BackendApplicationProject)
            .HasMaxLength(200);

        builder.Property(x => x.BackendDomainProject)
            .HasMaxLength(200);

        builder.Property(x => x.BackendInfrastructureProject)
            .HasMaxLength(200);

        //===========================================================
        // Backend Standard Module Structure
        //===========================================================

        builder.Property(x => x.BackendControllerFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendApplicationFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendInterfaceFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendEntityFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendRepositoryFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendConfigurationFolder)
            .HasMaxLength(300);

        //===========================================================
        // Backend Application Registration
        //===========================================================

        builder.Property(x => x.DependencyInjectionFile)
            .HasMaxLength(300);

        builder.Property(x => x.DbContextFile)
            .HasMaxLength(300);

        //===========================================================
        // Synchronization
        //===========================================================

        builder.Property(x => x.Status)
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(x => x.LastSynchronizationResult)
            .HasMaxLength(100);

        builder.Property(x => x.LastSynchronizedBy);

        builder.Property(x => x.LastSynchronizedDate);

        //===========================================================
        // Configuration
        //===========================================================

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);
    }
}