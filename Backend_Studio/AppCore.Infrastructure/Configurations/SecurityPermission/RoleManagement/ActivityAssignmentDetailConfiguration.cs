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
// Activity Assignment Detail Configuration
//===============================================================

public class ActivityAssignmentDetailConfiguration
    : IEntityTypeConfiguration<ActivityAssignmentDetail>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<ActivityAssignmentDetail> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "ActivityAssignmentDetails");

        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.ActivityAssignmentDetailId);

        builder.Property(
            x => x.ActivityAssignmentDetailId)
            .ValueGeneratedOnAdd();

        //=======================================================
        // Required
        //=======================================================

        builder.Property(
            x => x.ActivityAssignmentId)
            .IsRequired();

        builder.Property(
            x => x.ModuleId)
            .IsRequired();

        builder.Property(
            x => x.MenuId)
            .IsRequired();

        builder.Property(
            x => x.SubMenuId)
            .IsRequired();

        //=======================================================
        // Relationship : Header
        //=======================================================

        builder

            .HasOne(
                x => x.ActivityAssignment)

            .WithMany(
                x => x.Details)

            .HasForeignKey(
                x => x.ActivityAssignmentId)

            .OnDelete(
                DeleteBehavior.Cascade);

        //=======================================================
        // Relationship : Permissions
        //=======================================================

        builder

            .HasMany(
                x => x.ActivityAssignmentPermissions)

            .WithOne(
                x => x.ActivityAssignmentDetail)

            .HasForeignKey(
                x => x.ActivityAssignmentDetailId)

            .OnDelete(
                DeleteBehavior.Cascade);

        //=======================================================
        // Status
        //=======================================================

        builder.Property(
            x => x.IsActive)
            .HasDefaultValue(true);

        builder.Property(
            x => x.IsDeleted)
            .HasDefaultValue(false);

        //=======================================================
        // Audit
        //=======================================================

        builder.Property(
            x => x.CreatedDate)
            .IsRequired();

        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex(
            x => x.ActivityAssignmentId);

        builder.HasIndex(
            x => x.ModuleId);

        builder.HasIndex(
            x => x.MenuId);

        builder.HasIndex(
            x => x.SubMenuId);

        builder.HasIndex(
            x => x.IsActive);

        builder.HasIndex(
            x => x.IsDeleted);

        builder.HasIndex(
            x => new
            {
                x.ActivityAssignmentId,
                x.ModuleId,
                x.MenuId,
                x.SubMenuId
            })
            .IsUnique();
    }
}