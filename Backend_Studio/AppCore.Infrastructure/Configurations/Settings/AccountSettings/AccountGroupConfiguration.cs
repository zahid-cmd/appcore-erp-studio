//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Account Group Configuration
//===============================================================

public class AccountGroupConfiguration
    : IEntityTypeConfiguration<AccountGroup>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<AccountGroup> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("AccountGroups");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.AccountGroupId);

        builder.Property(x => x.AccountGroupId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Account Class
        //===========================================================

        builder.Property(x => x.AccountClassId)
               .IsRequired();

        builder.HasIndex(x => x.AccountClassId);


        //===========================================================
        // Class Code
        //===========================================================

        builder.Property(x => x.ClassCode)
               .IsRequired()
               .HasMaxLength(30);


        //===========================================================
        // Mode
        //===========================================================

        builder.Property(x => x.Mode)
               .IsRequired()
               .HasMaxLength(20);


        //===========================================================
        // Group Code
        //===========================================================

        builder.Property(x => x.GroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.GroupCode)
               .IsUnique();


        //===========================================================
        // Group Name
        //===========================================================

        builder.Property(x => x.GroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Manual Sub Group
        //===========================================================

        builder.Property(x => x.AllowManualSubGroup)
               .IsRequired()
               .HasDefaultValue(false);


        //===========================================================
        // Configuration
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


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


        //===========================================================
        // Account Class Relationship
        //===========================================================

        builder.HasOne<AccountClass>()
               .WithMany()
               .HasForeignKey(x => x.AccountClassId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}