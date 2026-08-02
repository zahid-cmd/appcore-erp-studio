//===============================================================
// Imports
//===============================================================

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SecurityPermission.RoleManagement;

//===============================================================
// Activity Assignment Configuration
//===============================================================

public class ActivityAssignmentConfiguration
    : IEntityTypeConfiguration<ActivityAssignment>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<ActivityAssignment> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "ActivityAssignments"
        );

        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.ActivityAssignmentId
        );

        builder.Property(
            x => x.ActivityAssignmentId
        )
        .ValueGeneratedOnAdd();

        //=======================================================
        // Required
        //=======================================================

        builder.Property(
            x => x.RoleProfileId
        )
        .IsRequired();

        //=======================================================
        // Unique Index
        //=======================================================

        builder
            .HasIndex(
                x => x.RoleProfileId
            )
            .IsUnique();

        //=======================================================
        // Relationship
        //=======================================================

        builder

            .HasMany(
                x => x.Details
            )

            .WithOne(
                x => x.ActivityAssignment
            )

            .HasForeignKey(
                x => x.ActivityAssignmentId
            )

            .OnDelete(
                DeleteBehavior.Cascade
            );

        //=======================================================
        // Status
        //=======================================================

        builder.Property(
            x => x.IsActive
        )
        .HasDefaultValue(
            true
        );

        builder.Property(
            x => x.IsDeleted
        )
        .HasDefaultValue(
            false
        );

        //=======================================================
        // Audit
        //=======================================================

        builder.Property(
            x => x.CreatedDate
        )
        .IsRequired();

        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.IsActive
        );

        builder.HasIndex(
            x => x.IsDeleted
        );
    }
}