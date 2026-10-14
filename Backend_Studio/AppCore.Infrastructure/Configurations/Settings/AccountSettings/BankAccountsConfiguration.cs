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

        builder.HasIndex(x => x.BankAccountCode)
               .IsUnique();

        //===========================================================
        // Bank Account Name
        //===========================================================

        builder.Property(x => x.BankAccountName)
               .IsRequired()
               .HasMaxLength(200);

        //===========================================================
        // Remarks
        //===========================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(1000);

        //===========================================================
        // Is Active
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