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
    :
    IEntityTypeConfiguration<ActivityAssignment>,
    IEntityTypeConfiguration<ActivityAssignmentDetail>,
    IEntityTypeConfiguration<ActivityAssignmentPermission>
{
    //===========================================================
    // Activity Assignment
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
                x => x.ActivityAssignment
            )
            .HasForeignKey(
                x => x.ActivityAssignmentId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder
            .HasIndex(
                x => x.RoleProfileId
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
    // Activity Assignment Detail
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<ActivityAssignmentDetail> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "ActivityAssignmentDetails"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.ActivityAssignmentDetailId
        );


        builder.Property(
            x => x.ActivityAssignmentDetailId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // Foreign Key
        //=======================================================

        builder.Property(
            x => x.ActivityAssignmentId
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
                x => x.ActivityAssignment
            )
            .WithMany(
                x => x.Details
            )
            .HasForeignKey(
                x => x.ActivityAssignmentId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Relationship : Permissions
        //=======================================================

        builder
            .HasMany(
                x => x.ActivityAssignmentPermissions
            )
            .WithOne(
                x => x.ActivityAssignmentDetail
            )
            .HasForeignKey(
                x => x.ActivityAssignmentDetailId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.ActivityAssignmentId
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
                    x.ActivityAssignmentId,
                    x.ModuleId,
                    x.MenuId,
                    x.SubMenuId
                }
            )
            .IsUnique();
    }


    //===========================================================
    // Activity Assignment Permission
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<ActivityAssignmentPermission> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "ActivityAssignmentPermissions"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.ActivityAssignmentPermissionId
        );


        builder.Property(
            x => x.ActivityAssignmentPermissionId
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // Foreign Key
        //=======================================================

        builder.Property(
            x => x.ActivityAssignmentDetailId
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
        // Relationship : Detail
        //=======================================================

        builder
            .HasOne(
                x => x.ActivityAssignmentDetail
            )
            .WithMany(
                x => x.ActivityAssignmentPermissions
            )
            .HasForeignKey(
                x => x.ActivityAssignmentDetailId
            )
            .OnDelete(
                DeleteBehavior.Cascade
            );


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.ActivityAssignmentDetailId
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