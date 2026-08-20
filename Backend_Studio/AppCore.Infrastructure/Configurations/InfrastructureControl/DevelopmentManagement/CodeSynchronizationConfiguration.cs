//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Code Synchronization Configuration
//===============================================================

public class CodeSynchronizationConfiguration
    : IEntityTypeConfiguration<CodeSynchronization>
{

    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<CodeSynchronization> builder
    )
    {

        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "CodeSynchronizations"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.Id
        );


        //=======================================================
        // Submenu Synchronization Reference
        //=======================================================

        builder.Property(
            x => x.SubmenuSynchronizationId
        )
        .IsRequired();


        //=======================================================
        // Navigation
        //=======================================================

        builder.Property(
            x => x.ModuleCode
        )
        .HasMaxLength(100)
        .IsRequired();


        builder.Property(
            x => x.ModuleName
        )
        .HasMaxLength(200)
        .IsRequired();


        builder.Property(
            x => x.MenuCode
        )
        .HasMaxLength(100)
        .IsRequired();


        builder.Property(
            x => x.MenuName
        )
        .HasMaxLength(200)
        .IsRequired();


        builder.Property(
            x => x.SubmenuCode
        )
        .HasMaxLength(100)
        .IsRequired();


        builder.Property(
            x => x.SubmenuName
        )
        .HasMaxLength(200)
        .IsRequired();


        //=======================================================
        // Synchronization Type
        //=======================================================

        builder.Property(
            x => x.SynchronizationType
        )
        .HasMaxLength(50)
        .IsRequired();


        //=======================================================
        // Status
        //=======================================================

        builder.Property(
            x => x.Status
        )
        .HasMaxLength(50)
        .IsRequired();


        //=======================================================
        // Build Status
        //=======================================================

        builder.Property(
            x => x.BuildStatus
        )
        .HasMaxLength(50)
        .IsRequired();


        //=======================================================
        // Database Status
        //=======================================================

        builder.Property(
            x => x.DbStatus
        )
        .HasMaxLength(50)
        .IsRequired();


        //=======================================================
        // Configuration
        //=======================================================

        builder.Property(
            x => x.Remarks
        )
        .HasMaxLength(1000);


        //=======================================================
        // Last Synchronization Result
        //=======================================================
        //
        // Build output can be substantially longer than 2000
        // characters. Use PostgreSQL text so the complete build
        // result can be stored without truncation.
        //
        //=======================================================

        builder.Property(
            x => x.LastSynchronizationResult
        )
        .HasColumnType("text")
        .IsRequired();


        //=======================================================
        // Index
        //=======================================================

        builder.HasIndex(
            x => x.SubmenuSynchronizationId
        );


        builder.HasIndex(
            x => new
            {
                x.SubmenuId,
                x.SynchronizationType
            }
        );


        builder.HasIndex(
            x => new
            {
                x.ModuleId,
                x.MenuId,
                x.SubmenuId,
                x.SynchronizationType
            }
        );

    }

}