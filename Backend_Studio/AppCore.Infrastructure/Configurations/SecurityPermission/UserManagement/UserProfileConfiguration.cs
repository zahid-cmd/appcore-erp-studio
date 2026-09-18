//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.SecurityPermission.UserManagement;


//===============================================================
// User Profile Configuration
//===============================================================

public class UserProfileConfiguration
    : IEntityTypeConfiguration<UserProfile>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<UserProfile> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("UserProfiles");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.UserProfileId);

        builder.Property(x => x.UserProfileId)
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
        // User Name / Login ID
        //===========================================================

        builder.Property(x => x.UserName)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(x => x.UserName)
               .IsUnique();


        //===========================================================
        // Display Name
        //===========================================================

        builder.Property(x => x.DisplayName)
               .IsRequired()
               .HasMaxLength(150);


        //===========================================================
        // Full Name
        //===========================================================

        builder.Property(x => x.FullName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Contact Information
        //===========================================================

        builder.Property(x => x.Email)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.MobileNo)
               .IsRequired()
               .HasMaxLength(30);


        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.IsActive)
               .IsRequired()
               .HasDefaultValue(true);


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