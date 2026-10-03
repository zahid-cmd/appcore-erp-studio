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
// Branch Assignment Configuration
//===============================================================

public class BranchAssignmentConfiguration
    :
    IEntityTypeConfiguration<BranchAssignment>,
    IEntityTypeConfiguration<BranchAssignmentDetail>
{
    //===========================================================
    // Branch Assignment
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<BranchAssignment> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "BranchAssignments"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.BranchAssignmentId
        );


        builder.Property(
            x => x.BranchAssignmentId
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
                x => x.BranchAssignment
            )
            .HasForeignKey(
                x => x.BranchAssignmentId
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
    // Branch Assignment Detail
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<BranchAssignmentDetail> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "BranchAssignmentDetails"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.BranchAssignmentDetailId
        );


        builder.Property(
            x => x.BranchAssignmentDetailId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // Foreign Key
        //=======================================================

        builder.Property(
            x => x.BranchAssignmentId
        )
        .IsRequired();


        //=======================================================
        // Branch
        //=======================================================

        builder.Property(
            x => x.BranchId
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
                x => x.BranchAssignment
            )
            .WithMany(
                x => x.Details
            )
            .HasForeignKey(
                x => x.BranchAssignmentId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.BranchAssignmentId
        );


        builder.HasIndex(
            x => x.BranchId
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
                    x.BranchAssignmentId,
                    x.BranchId
                }
            )
            .IsUnique();
    }
}