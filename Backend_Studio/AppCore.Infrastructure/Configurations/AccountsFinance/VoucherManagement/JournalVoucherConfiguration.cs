//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.AccountsFinance.VoucherManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.VoucherManagement;


//===============================================================
// Journal Voucher Configuration
//
// One class configures the header and its lines (the database
// engine creates / drops both together). Lines hold the debits
// and credits (Side, GroupNo).
//===============================================================

public class JournalVoucherConfiguration
    : IEntityTypeConfiguration<JournalVoucher>,
      IEntityTypeConfiguration<JournalVoucherLines>
{
    //===========================================================
    // Header
    //===========================================================

    public void Configure(
        EntityTypeBuilder<JournalVoucher> builder)
    {
        builder.ToTable("JournalVoucher");

        builder.HasKey(x => x.JournalVoucherId);

        builder.Property(x => x.JournalVoucherId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        // Numbers are never reused (deleted drafts included)
        builder.HasIndex(x => x.VoucherNo)
               .IsUnique()
               .HasDatabaseName("UX_JournalVoucher_VoucherNo");

        builder.Property(x => x.VoucherDate)
               .IsRequired();

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.BranchCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.FinancialYearId)
               .IsRequired();

        builder.Property(x => x.LedgerType)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.PartyName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.TotalAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.GroupCount)
               .IsRequired();

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.CancelReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.HasIndex(x => new { x.VoucherDate, x.BranchId })
               .HasDatabaseName("IX_JournalVoucher_Date_Branch");

        builder.HasIndex(x => x.Status)
               .HasDatabaseName("IX_JournalVoucher_Status");
    }


    //===========================================================
    // Lines
    //===========================================================

    public void Configure(
        EntityTypeBuilder<JournalVoucherLines> builder)
    {
        builder.ToTable("JournalVoucherLines");

        builder.HasKey(x => x.JournalVoucherLineId);

        builder.Property(x => x.JournalVoucherLineId)
               .ValueGeneratedOnAdd();

        builder.HasOne<JournalVoucher>()
               .WithMany()
               .HasForeignKey(x => x.JournalVoucherId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.LineNo)
               .IsRequired();

        builder.Property(x => x.GroupNo)
               .IsRequired();

        builder.Property(x => x.Side)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.LedgerType)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.SubGroupCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.SubGroupName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.LedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.PartyCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(250);

        builder.HasIndex(x => x.JournalVoucherId)
               .HasDatabaseName("IX_JournalVoucherLines_Voucher");

        // Ledger reports : rows of a ledger
        builder.HasIndex(x => x.LedgerCode)
               .HasDatabaseName("IX_JournalVoucherLines_Ledger");
    }
}