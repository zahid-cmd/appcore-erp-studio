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
// Account Sub Group Configuration
//===============================================================

public class AccountSubGroupConfiguration
    : IEntityTypeConfiguration<AccountSubGroup>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<AccountSubGroup> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("AccountSubGroups");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.AccountSubGroupId);

        builder.Property(x => x.AccountSubGroupId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Account Class
        //===========================================================

        builder.Property(x => x.AccountClassId)
               .IsRequired();

        builder.HasIndex(x => x.AccountClassId);


        //===========================================================
        // Account Group
        //===========================================================

        builder.Property(x => x.AccountGroupId)
               .IsRequired();

        builder.HasIndex(x => x.AccountGroupId);


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


        //===========================================================
        // Sub Group Code
        //===========================================================

        builder.Property(x => x.SubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.SubGroupCode)
               .IsUnique();


        //===========================================================
        // Sub Group Name
        //===========================================================

        builder.Property(x => x.SubGroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Manual Ledger
        //===========================================================

        builder.Property(x => x.AllowManualLedger)
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


        //===========================================================
        // Account Group Relationship
        //===========================================================

        builder.HasOne<AccountGroup>()
               .WithMany()
               .HasForeignKey(x => x.AccountGroupId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}