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

public class RoleProfileConfiguration
    : IEntityTypeConfiguration<RoleProfile>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<RoleProfile> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("RoleProfiles");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.RoleProfileId);

        builder.Property(x => x.RoleProfileId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Profile Code
        //===========================================================

        builder.Property(x => x.ProfileCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.ProfileCode)
               .IsUnique();


        //===========================================================
        // Basic Information
        //===========================================================

        builder.Property(x => x.ProfileName)
               .IsRequired()
               .HasMaxLength(100);


        //===========================================================
        // Description
        //===========================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(500);


        //===========================================================
        // Display Information
        //===========================================================

        builder.Property(x => x.DisplayOrder)
               .IsRequired();


        //===========================================================
        // System Flags
        //===========================================================

        builder.Property(x => x.IsSystemRole)
               .IsRequired();

        builder.Property(x => x.IsDefaultRole)
               .IsRequired();


        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.IsActive)
               .IsRequired();


        //===========================================================
        // Soft Delete
        //===========================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //===========================================================
        // Audit Information
        //===========================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}