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
// EMI Accounts Configuration
//===============================================================

public class EmiAccountsConfiguration
    : IEntityTypeConfiguration<EmiAccounts>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<EmiAccounts> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("EmiAccounts");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x => x.EmiAccountId);

        builder.Property(x => x.EmiAccountId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Account Sub Group (no database FK; checked by the
        // repository, like the other account pages)
        //=======================================================

        builder.Property(x => x.AccountSubGroupsId)
               .IsRequired();

        builder.HasIndex(x => x.AccountSubGroupsId)
               .HasDatabaseName("IX_EmiAccounts_AccountSubGroupsId");


        //=======================================================
        // EMI Account Code (deleted rows included : never reused)
        //=======================================================

        builder.Property(x => x.EmiAccountCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.EmiAccountCode)
               .IsUnique()
               .HasDatabaseName("UX_EmiAccounts_EmiAccountCode");


        //=======================================================
        // EMI Account Name (auto generated)
        //=======================================================

        builder.Property(x => x.EmiAccountName)
               .IsRequired()
               .HasMaxLength(200);

        builder.HasIndex(x => x.EmiAccountName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("UX_EmiAccounts_EmiAccountName");


        //=======================================================
        // Platform / Linked Bank Account
        //=======================================================

        builder.Property(x => x.Platform)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.LinkedBankAccount)
               .IsRequired()
               .HasMaxLength(100);

        // One live EMI account per Platform
        builder.HasIndex(x => x.Platform)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("UX_EmiAccounts_Platform");


        //=======================================================
        // Branch
        //=======================================================

        builder.Property(x => x.Branch)
               .IsRequired()
               .HasMaxLength(200);


        //=======================================================
        // Configuration
        //=======================================================

        // No HasDefaultValue(true) on CollectionAccount / Status :
        // EF would skip a false value on insert and the database
        // default (true) would win.
        builder.Property(x => x.CollectionAccount)
               .IsRequired();

        builder.Property(x => x.PaymentAccount)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.BranchExclusive)
               .IsRequired()
               .HasDefaultValue(false);


        //=======================================================
        // Remarks / Status
        //=======================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000)
               .HasDefaultValue(string.Empty);

        builder.Property(x => x.Status)
               .IsRequired();


        //=======================================================
        // Soft Delete
        //=======================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //=======================================================
        // Audit
        //=======================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}