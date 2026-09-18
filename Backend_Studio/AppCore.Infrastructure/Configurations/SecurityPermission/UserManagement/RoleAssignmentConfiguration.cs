//===============================================================
// Imports
//===============================================================

using AppCore.Domain.Entities.SecurityPermission.UserManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SecurityPermission.UserManagement;


//===============================================================
// Role Assignment Configuration
//===============================================================

public class RoleAssignmentConfiguration
    :
    IEntityTypeConfiguration<RoleAssignment>,
    IEntityTypeConfiguration<RoleAssignmentDetail>
{
    //===========================================================
    // Role Assignment
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<RoleAssignment> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "RoleAssignments"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.RoleAssignmentId
        );


        builder.Property(
            x => x.RoleAssignmentId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // User Profile
        //=======================================================

        builder.Property(
            x => x.UserProfileId
        )
        .IsRequired();


        //=======================================================
        // Status
        //
        // Explicitly sent by EF.
        // Do not depend on database default values.
        //=======================================================

        builder.Property(
            x => x.IsActive
        )
        .IsRequired()
        .ValueGeneratedNever();


        builder.Property(
            x => x.IsDeleted
        )
        .IsRequired()
        .ValueGeneratedNever();


        //=======================================================
        // Audit
        //=======================================================

        builder.Property(
            x => x.CreatedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.CreatedDate
        )
        .IsRequired();


        builder.Property(
            x => x.ModifiedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.ModifiedDate
        )
        .IsRequired(false);


        builder.Property(
            x => x.DeletedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.DeletedDate
        )
        .IsRequired(false);


        //=======================================================
        // Relationship : Details
        //=======================================================

        builder
            .HasMany(
                x => x.Details
            )
            .WithOne(
                x => x.RoleAssignment
            )
            .HasForeignKey(
                x => x.RoleAssignmentId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder
            .HasIndex(
                x => x.UserProfileId
            )
            .IsUnique();


        builder.HasIndex(
            x => x.IsActive
        );


        builder.HasIndex(
            x => x.IsDeleted
        );
    }


    //===========================================================
    // Role Assignment Detail
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<RoleAssignmentDetail> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "RoleAssignmentDetails"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.RoleAssignmentDetailId
        );


        builder.Property(
            x => x.RoleAssignmentDetailId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // Foreign Key
        //=======================================================

        builder.Property(
            x => x.RoleAssignmentId
        )
        .IsRequired();


        //=======================================================
        // Role Profile
        //=======================================================

        builder.Property(
            x => x.RoleProfileId
        )
        .IsRequired();


        //=======================================================
        // Status
        //
        // Explicitly sent by EF.
        //=======================================================

        builder.Property(
            x => x.IsActive
        )
        .IsRequired()
        .ValueGeneratedNever();


        builder.Property(
            x => x.IsDeleted
        )
        .IsRequired()
        .ValueGeneratedNever();


        //=======================================================
        // Audit
        //=======================================================

        builder.Property(
            x => x.CreatedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.CreatedDate
        )
        .IsRequired();


        builder.Property(
            x => x.ModifiedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.ModifiedDate
        )
        .IsRequired(false);


        builder.Property(
            x => x.DeletedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.DeletedDate
        )
        .IsRequired(false);


        //=======================================================
        // Relationship : Header
        //=======================================================

        builder
            .HasOne(
                x => x.RoleAssignment
            )
            .WithMany(
                x => x.Details
            )
            .HasForeignKey(
                x => x.RoleAssignmentId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.RoleAssignmentId
        );


        builder.HasIndex(
            x => x.RoleProfileId
        );


        builder.HasIndex(
            x => x.IsActive
        );


        builder.HasIndex(
            x => x.IsDeleted
        );


        //=======================================================
        // Unique Detail
        //=======================================================

        builder
            .HasIndex(
                x => new
                {
                    x.RoleAssignmentId,
                    x.RoleProfileId
                }
            )
            .IsUnique();
    }
}