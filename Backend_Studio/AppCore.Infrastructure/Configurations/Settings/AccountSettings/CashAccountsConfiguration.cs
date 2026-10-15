// PAGE-CLONED : Wings -> Cash Accounts
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
// CashAccounts Configuration
//===============================================================

public class CashAccountsConfiguration
    : IEntityTypeConfiguration<CashAccounts>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<CashAccounts> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("CashAccounts");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.CashAccountId);

        builder.Property(x => x.CashAccountId)
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
        // Cash Account Code
        //===========================================================

        builder.Property(x => x.CashAccountCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.CashAccountCode)
               .IsUnique();

        //===========================================================
        // Cash Account Name
        //===========================================================

        builder.Property(x => x.CashAccountName)
               .IsRequired()
               .HasMaxLength(200);

        //===========================================================
        // Remarks
        //===========================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(1000);

        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.Status)
               .IsRequired()
               .HasDefaultValue(false);

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
               .IsRequired()
               .HasDefaultValue(false);

        //===========================================================
        // Payment Account
        //===========================================================

        builder.Property(x => x.PaymentAccount)
               .IsRequired()
               .HasDefaultValue(false);

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