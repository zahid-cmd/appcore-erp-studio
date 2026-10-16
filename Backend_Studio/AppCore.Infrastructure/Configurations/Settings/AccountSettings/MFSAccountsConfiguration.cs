//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.AccountSettings;


//===============================================================
// MFS Accounts Configuration
//===============================================================

public class MFSAccountsConfiguration
    : IEntityTypeConfiguration<MFSAccounts>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<MFSAccounts> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("MFSAccounts");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x => x.MFSAccountId);

        builder.Property(x => x.MFSAccountId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Account Sub Group
        //=======================================================

        builder.Property(x => x.AccountSubGroupsId)
               .IsRequired();

        builder.HasIndex(x => x.AccountSubGroupsId);

        builder.HasOne<AccountSubGroup>()
               .WithMany()
               .HasForeignKey(x => x.AccountSubGroupsId)
               .OnDelete(DeleteBehavior.Restrict);


        //=======================================================
        // MFS Account Code (unique, including deleted rows)
        //=======================================================

        builder.Property(x => x.MFSAccountCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.MFSAccountCode)
               .IsUnique();


        //=======================================================
        // MFS Account Name (Provider)
        //=======================================================

        builder.Property(x => x.MFSAccountName)
               .IsRequired()
               .HasMaxLength(200);


        //=======================================================
        // MFS Account Number
        //=======================================================

        builder.Property(x => x.MFSAccountNumber)
               .IsRequired()
               .HasMaxLength(100);


        //=======================================================
        // Account Type (Personal / Merchant)
        //=======================================================

        builder.Property(x => x.AccountType)
               .IsRequired()
               .HasMaxLength(100)
               .HasDefaultValue("Personal");


        //=======================================================
        // MFS Charges (%)
        //=======================================================

        builder.Property(x => x.MFSCharges)
               .IsRequired()
               .HasColumnType("numeric(5,2)")
               .HasDefaultValue(0m);


        //=======================================================
        // Linked Bank Account
        // (empty string for Personal accounts)
        //=======================================================

        builder.Property(x => x.LinkedBankAccount)
               .IsRequired()
               .HasMaxLength(100);


        //=======================================================
        // Branch
        //=======================================================

        builder.Property(x => x.Branch)
               .IsRequired()
               .HasMaxLength(1000);


        //=======================================================
        // Display Name
        //=======================================================

        builder.Property(x => x.DisplayName)
               .HasMaxLength(100);


        //=======================================================
        // Configuration Flags
        //=======================================================

        builder.Property(x => x.CollectionAccount)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.PaymentAccount)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.BranchExclusive)
               .IsRequired()
               .HasDefaultValue(false);


        //=======================================================
        // Remarks
        //=======================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(1000);


        //=======================================================
        // Status
        //=======================================================

        builder.Property(x => x.Status)
               .IsRequired()
               .HasDefaultValue(false);


        //=======================================================
        // Soft Delete
        //=======================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //=======================================================
        // Audit Information
        //=======================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}