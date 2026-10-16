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
// POS Accounts Configuration
//===============================================================

public class POSAccountsConfiguration
    : IEntityTypeConfiguration<POSAccounts>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<POSAccounts> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("POSAccounts");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x => x.POSAccountId);

        builder.Property(x => x.POSAccountId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Account Sub Groups Id
        //=======================================================

        builder.Property(x => x.AccountSubGroupsId)
               .IsRequired();

        builder.HasIndex(x => x.AccountSubGroupsId);

        builder.HasOne<AccountSubGroup>()
               .WithMany()
               .HasForeignKey(x => x.AccountSubGroupsId)
               .OnDelete(DeleteBehavior.Restrict);


        //=======================================================
        // POS Account Code
        //=======================================================

        builder.Property(x => x.POSAccountCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.POSAccountCode)
               .IsUnique();


        //=======================================================
        // POS Account Name (auto generated)
        //
        // POS - <Issuing Bank Short> - <Terminal> - <Linked Bank Short>
        //=======================================================

        builder.Property(x => x.POSAccountName)
               .IsRequired()
               .HasMaxLength(200);


        //=======================================================
        // Issuing Bank (Bank Setup → Bank Name)
        //=======================================================

        builder.Property(x => x.IssuingBank)
               .IsRequired()
               .HasMaxLength(200)
               .HasDefaultValue(string.Empty);

        builder.HasIndex(x => x.IssuingBank);


        //=======================================================
        // Terminal Number
        //=======================================================

        builder.Property(x => x.TerminalNumber)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(x => x.TerminalNumber);


        //=======================================================
        // Linked Bank Account
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
        // Flags
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