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
// Submenu Synchronization Configuration
//===============================================================

public class SubmenuSynchronizationConfiguration
    : IEntityTypeConfiguration<SubmenuSynchronization>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<SubmenuSynchronization> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable
        (
            "INF_SubmenuSynchronization"
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

        builder.Property(x => x.SubmenuCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.SubmenuName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.SynchronizationType)
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex
        (
            x => new
            {
                x.SubmenuId,
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

        builder.Property(x => x.FrontendMenuFolder)
            .HasMaxLength(300);

        //=======================================================
        // Frontend Submenu Location
        //=======================================================

        builder.Property(x => x.FrontendSubmenuFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendPagesFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendFormFolder)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendListFolder)
            .HasMaxLength(300);

        //=======================================================
        // Frontend Submenu Core Files
        //=======================================================

        builder.Property(x => x.FrontendSubmenuModelFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendSubmenuServiceFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendSubmenuRouteFile)
            .HasMaxLength(300);

        //=======================================================
        // Frontend Submenu Page Files
        //=======================================================

        builder.Property(x => x.FrontendSubmenuFormTsFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendSubmenuFormHtmlFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendSubmenuFormCssFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendSubmenuListTsFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendSubmenuListHtmlFile)
            .HasMaxLength(300);

        builder.Property(x => x.FrontendSubmenuListCssFile)
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
        // Backend API
        //=======================================================

        builder.Property(x => x.BackendControllerFile)
            .HasMaxLength(300);

        //=======================================================
        // Backend Application
        //=======================================================

        builder.Property(x => x.BackendApplicationSubMenuFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendApplicationDtosFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendApplicationInterfacesFolder)
            .HasMaxLength(300);

        builder.Property(x => x.BackendSubMenuDtoFile)
            .HasMaxLength(300);

        builder.Property(x => x.BackendCreateSubMenuDtoFile)
            .HasMaxLength(300);

        builder.Property(x => x.BackendUpdateSubMenuDtoFile)
            .HasMaxLength(300);

        builder.Property(x => x.BackendSubMenuDefaultsDtoFile)
            .HasMaxLength(300);

        builder.Property(x => x.BackendSubMenuRepositoryInterfaceFile)
            .HasMaxLength(300);

        //=======================================================
        // Backend Domain
        //=======================================================

        builder.Property(x => x.BackendSubMenuEntityFile)
            .HasMaxLength(300);

        //=======================================================
        // Backend Infrastructure
        //=======================================================

        builder.Property(x => x.BackendSubMenuConfigurationFile)
            .HasMaxLength(300);

        builder.Property(x => x.BackendSubMenuRepositoryFile)
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