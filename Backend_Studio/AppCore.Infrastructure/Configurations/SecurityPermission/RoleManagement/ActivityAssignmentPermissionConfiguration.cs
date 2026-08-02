//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SecurityPermission.RoleManagement;

//===============================================================
// Activity Assignment Permission Configuration
//===============================================================

public class ActivityAssignmentPermissionConfiguration
    : IEntityTypeConfiguration<ActivityAssignmentPermission>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<ActivityAssignmentPermission> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "ActivityAssignmentPermissions");

        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.ActivityAssignmentPermissionId);

        builder.Property(
            x => x.ActivityAssignmentPermissionId)
            .ValueGeneratedOnAdd();

        //=======================================================
        // Required
        //=======================================================

        builder.Property(
            x => x.ActivityAssignmentDetailId)
            .IsRequired();

        //=======================================================
        // Relationship
        //=======================================================

        builder

            .HasOne(
                x => x.ActivityAssignmentDetail)

            .WithMany(
                x => x.ActivityAssignmentPermissions)

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
            x => x.ActivityAssignmentDetailId);

        builder.HasIndex(
            x => x.MasterActivityId);

        builder.HasIndex(
            x => x.NavigationActivityId);

        builder.HasIndex(
            x => x.IsActive);

        builder.HasIndex(
            x => x.IsDeleted);
    }
}