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
// Special Assignment Configuration
//===============================================================

public class SpecialAssignmentConfiguration
    :
    IEntityTypeConfiguration<SpecialAssignment>,
    IEntityTypeConfiguration<SpecialAssignmentDetail>,
    IEntityTypeConfiguration<SpecialAssignmentPermission>
{
    //===========================================================
    // Special Assignment
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<SpecialAssignment> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "SpecialAssignments"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.SpecialAssignmentId
        );


        builder.Property(
            x => x.SpecialAssignmentId
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
        // Delete Audit
        //=======================================================

        builder.Property(
            x => x.DeletedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.DeletedDate
        )
        .IsRequired(false);


        //=======================================================
        // Create Audit
        //=======================================================

        builder.Property(
            x => x.CreatedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.CreatedDate
        )
        .IsRequired();


        //=======================================================
        // Modify Audit
        //=======================================================

        builder.Property(
            x => x.ModifiedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.ModifiedDate
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
                x => x.SpecialAssignment
            )
            .HasForeignKey(
                x => x.SpecialAssignmentId
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
    // Special Assignment Detail
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<SpecialAssignmentDetail> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "SpecialAssignmentDetails"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.SpecialAssignmentDetailId
        );


        builder.Property(
            x => x.SpecialAssignmentDetailId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // Foreign Key
        //=======================================================

        builder.Property(
            x => x.SpecialAssignmentId
        )
        .IsRequired();


        //=======================================================
        // Navigation
        //=======================================================

        builder.Property(
            x => x.ModuleId
        )
        .IsRequired();


        builder.Property(
            x => x.MenuId
        )
        .IsRequired();


        builder.Property(
            x => x.SubMenuId
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
        // Delete Audit
        //=======================================================

        builder.Property(
            x => x.DeletedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.DeletedDate
        )
        .IsRequired(false);


        //=======================================================
        // Create Audit
        //=======================================================

        builder.Property(
            x => x.CreatedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.CreatedDate
        )
        .IsRequired();


        //=======================================================
        // Modify Audit
        //=======================================================

        builder.Property(
            x => x.ModifiedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.ModifiedDate
        )
        .IsRequired(false);


        //=======================================================
        // Relationship : Header
        //=======================================================

        builder
            .HasOne(
                x => x.SpecialAssignment
            )
            .WithMany(
                x => x.Details
            )
            .HasForeignKey(
                x => x.SpecialAssignmentId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Relationship : Permissions
        //=======================================================

        builder
            .HasMany(
                x => x.SpecialAssignmentPermissions
            )
            .WithOne(
                x => x.SpecialAssignmentDetail
            )
            .HasForeignKey(
                x => x.SpecialAssignmentDetailId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.SpecialAssignmentId
        );


        builder.HasIndex(
            x => x.ModuleId
        );


        builder.HasIndex(
            x => x.MenuId
        );


        builder.HasIndex(
            x => x.SubMenuId
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
                    x.SpecialAssignmentId,
                    x.ModuleId,
                    x.MenuId,
                    x.SubMenuId
                }
            )
            .IsUnique();
    }


    //===========================================================
    // Special Assignment Permission
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<SpecialAssignmentPermission> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "SpecialAssignmentPermissions"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.SpecialAssignmentPermissionId
        );


        builder.Property(
            x => x.SpecialAssignmentPermissionId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // Foreign Key
        //=======================================================

        builder.Property(
            x => x.SpecialAssignmentDetailId
        )
        .IsRequired();


        //=======================================================
        // Activity References
        //=======================================================

        builder.Property(
            x => x.MasterActivityId
        )
        .IsRequired(false);


        builder.Property(
            x => x.NavigationActivityId
        )
        .IsRequired(false);


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
        // Delete Audit
        //=======================================================

        builder.Property(
            x => x.DeletedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.DeletedDate
        )
        .IsRequired(false);


        //=======================================================
        // Create Audit
        //=======================================================

        builder.Property(
            x => x.CreatedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.CreatedDate
        )
        .IsRequired();


        //=======================================================
        // Modify Audit
        //=======================================================

        builder.Property(
            x => x.ModifiedBy
        )
        .IsRequired(false);


        builder.Property(
            x => x.ModifiedDate
        )
        .IsRequired(false);


        //=======================================================
        // Relationship : Detail
        //=======================================================

        builder
            .HasOne(
                x => x.SpecialAssignmentDetail
            )
            .WithMany(
                x => x.SpecialAssignmentPermissions
            )
            .HasForeignKey(
                x => x.SpecialAssignmentDetailId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.SpecialAssignmentDetailId
        );


        builder.HasIndex(
            x => x.MasterActivityId
        );


        builder.HasIndex(
            x => x.NavigationActivityId
        );


        builder.HasIndex(
            x => x.IsActive
        );


        builder.HasIndex(
            x => x.IsDeleted
        );
    }
}