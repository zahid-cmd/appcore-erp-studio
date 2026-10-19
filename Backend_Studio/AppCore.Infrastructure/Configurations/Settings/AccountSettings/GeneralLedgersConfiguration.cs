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
// General Ledgers Configuration
//===============================================================

public class GeneralLedgersConfiguration
    : IEntityTypeConfiguration<GeneralLedgers>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<GeneralLedgers> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("GeneralLedgers");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.GeneralLedgerId);

        builder.Property(x => x.GeneralLedgerId)
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
        // Account Sub Group
        //===========================================================

        builder.Property(x => x.AccountSubGroupId)
               .IsRequired();

        builder.HasIndex(x => x.AccountSubGroupId);


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


        //===========================================================
        // Ledger Code
        //===========================================================

        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.LedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_GeneralLedgers_LedgerCode");


        //===========================================================
        // Ledger Name
        //===========================================================

        builder.Property(x => x.LedgerName)
               .IsRequired()
               .HasMaxLength(200);

        // Unique within its sub group, among non-deleted rows only
        builder.HasIndex(x => new { x.AccountSubGroupId, x.LedgerName })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_GeneralLedgers_AccountSubGroupId_LedgerName");


        //===========================================================
        // Configuration
        //===========================================================

        // TODO: Add General Ledger specific configuration here

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


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


        //===========================================================
        // Account Sub Group Relationship
        //===========================================================

        builder.HasOne<AccountSubGroup>()
               .WithMany()
               .HasForeignKey(x => x.AccountSubGroupId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}