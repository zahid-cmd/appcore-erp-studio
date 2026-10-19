// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
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
// BankAccounts Configuration
//===============================================================

public class BankAccountsConfiguration
    : IEntityTypeConfiguration<BankAccounts>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<BankAccounts> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("BankAccounts");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.BankAccountId);

        builder.Property(x => x.BankAccountId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Account Sub Groups Id
        //===========================================================

        builder.Property(x => x.AccountSubGroupsId)
               .IsRequired();

        builder.HasIndex(x => x.AccountSubGroupsId);

        builder.HasOne<AccountSubGroup>()
               .WithMany()
               .HasForeignKey(x => x.AccountSubGroupsId)
               .OnDelete(DeleteBehavior.Restrict);

        //===========================================================
        // Bank Account Code
        //===========================================================

        builder.Property(x => x.BankAccountCode)
               .IsRequired()
               .HasMaxLength(30);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.BankAccountCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_BankAccounts_BankAccountCode");

        //===========================================================
        // Bank Account Name
        //===========================================================

        builder.Property(x => x.BankAccountName)
               .IsRequired()
               .HasMaxLength(200);

        // Unique within a branch, among non-deleted rows only
        builder.HasIndex(x => new { x.Branch, x.BankAccountName })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_BankAccounts_Branch_BankAccountName");

        //===========================================================
        // Remarks
        //===========================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(1000);

        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.Status)
               .IsRequired();

        //===========================================================
        // Branch
        //===========================================================

        builder.Property(x => x.Branch)
               .IsRequired()
               .HasMaxLength(1000);

        //===========================================================
        // Display Name
        //===========================================================

        builder.Property(x => x.DisplayName)
               .HasMaxLength(100);

        //===========================================================
        // Collection Account
        //===========================================================

        builder.Property(x => x.CollectionAccount)
               .IsRequired();

        //===========================================================
        // Payment Account
        //===========================================================

        builder.Property(x => x.PaymentAccount)
               .IsRequired();

        //===========================================================
        // Bank
        //===========================================================

        builder.Property(x => x.Bank)
               .IsRequired()
               .HasMaxLength(100);

        //===========================================================
        // Full Account Number
        //===========================================================

        builder.Property(x => x.FullAccountNumber)
               .IsRequired()
               .HasMaxLength(100);

        //===========================================================
        // Short Account Name
        //===========================================================

        builder.Property(x => x.ShortAccountName)
               .IsRequired()
               .HasMaxLength(100);

        //===========================================================
        // Short Account Number
        //===========================================================

        builder.Property(x => x.ShortAccountNumber)
               .IsRequired()
               .HasMaxLength(100);

        //===========================================================
        // Short Branch Name
        //===========================================================

        builder.Property(x => x.ShortBranchName)
               .IsRequired()
               .HasMaxLength(100);

        //===========================================================
        // Swift Code
        //===========================================================

        builder.Property(x => x.SwiftCode)
               .HasMaxLength(100);

        //===========================================================
        // Routing Number
        //===========================================================

        builder.Property(x => x.RoutingNumber)
               .HasMaxLength(100);

        //===========================================================
        // Branch Exclusive
        //===========================================================

        builder.Property(x => x.BranchExclusive)
               .IsRequired();

        //===========================================================
        // Bank Branch Name
        //===========================================================

        builder.Property(x => x.BankBranchName)
               .IsRequired()
               .HasMaxLength(100);


        //===========================================================
        // Sanction Limit (optional; Liability For Finance only)
        //===========================================================

        builder.Property(x => x.SanctionLimit)
               .HasPrecision(18, 2);

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