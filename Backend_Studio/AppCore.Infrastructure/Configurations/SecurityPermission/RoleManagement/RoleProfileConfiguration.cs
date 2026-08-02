//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.SecurityPermission.RoleManagement;

//===============================================================
// Role Profile Configuration
//===============================================================

public class RoleProfileConfiguration : IEntityTypeConfiguration<RoleProfile>
{
    public void Configure(EntityTypeBuilder<RoleProfile> builder)
    {
        /* =====================================================
           TABLE
        ===================================================== */

        builder.ToTable("SEC_RoleProfile");

        /* =====================================================
           PRIMARY KEY
        ===================================================== */

        builder.HasKey(x => x.RoleProfileId);

        /* =====================================================
           BASIC INFORMATION
        ===================================================== */

        builder.Property(x => x.ProfileCode)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.ProfileName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.DisplayName)
            .HasMaxLength(100)
            .IsRequired();

        /* =====================================================
           PROFILE TYPE
        ===================================================== */

        builder.Property(x => x.ProfileTypeId)
            .IsRequired();

        /* =====================================================
           DESCRIPTION
        ===================================================== */

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);

        /* =====================================================
           DISPLAY
        ===================================================== */

        builder.Property(x => x.DisplayOrder)
            .HasDefaultValue(1);

        /* =====================================================
           SYSTEM FLAGS
        ===================================================== */

        builder.Property(x => x.IsSystemRole)
            .HasDefaultValue(false);

        builder.Property(x => x.IsDefaultRole)
            .HasDefaultValue(false);

        /* =====================================================
           STATUS
        ===================================================== */

        builder.Property(x => x.IsActive)
            .HasDefaultValue(true);

        builder.Property(x => x.IsDeleted)
            .HasDefaultValue(false);

        /* =====================================================
           UNIQUE INDEXES
        ===================================================== */

        builder.HasIndex(x => x.ProfileCode)
            .IsUnique();

        builder.HasIndex(x => x.ProfileName)
            .IsUnique();

        builder.HasIndex(x => x.DisplayName)
            .IsUnique();

        /* =====================================================
           INDEXES
        ===================================================== */

        builder.HasIndex(x => x.ProfileTypeId);

        builder.HasIndex(x => x.IsActive);

        builder.HasIndex(x => x.IsDeleted);
    }
}