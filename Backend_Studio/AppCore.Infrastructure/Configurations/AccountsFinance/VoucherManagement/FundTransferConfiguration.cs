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
// Fund Transfer Configuration
//
// One class configures the header and its lines (the database
// engine creates / drops both together). Lines hold the From
// (credit) and To (debit) rows.
//===============================================================

public class FundTransferConfiguration
    : IEntityTypeConfiguration<FundTransfer>,
      IEntityTypeConfiguration<FundTransferLines>
{
    //===========================================================
    // Header
    //===========================================================

    public void Configure(
        EntityTypeBuilder<FundTransfer> builder)
    {
        builder.ToTable("FundTransfer");

        builder.HasKey(x => x.FundTransferId);

        builder.Property(x => x.FundTransferId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        // Numbers are never reused (deleted drafts included)
        builder.HasIndex(x => x.VoucherNo)
               .IsUnique()
               .HasDatabaseName("UX_FundTransfer_VoucherNo");

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

        builder.Property(x => x.TransferType)
               .IsRequired()
               .HasMaxLength(60);

        builder.Property(x => x.PartyName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.TotalAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Charges)
               .IsRequired()
               .HasPrecision(18, 2);

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
               .HasDatabaseName("IX_FundTransfer_Date_Branch");

        builder.HasIndex(x => x.Status)
               .HasDatabaseName("IX_FundTransfer_Status");
    }


    //===========================================================
    // Lines
    //===========================================================

    public void Configure(
        EntityTypeBuilder<FundTransferLines> builder)
    {
        builder.ToTable("FundTransferLines");

        builder.HasKey(x => x.FundTransferLineId);

        builder.Property(x => x.FundTransferLineId)
               .ValueGeneratedOnAdd();

        builder.HasOne<FundTransfer>()
               .WithMany()
               .HasForeignKey(x => x.FundTransferId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.LineNo)
               .IsRequired();

        builder.Property(x => x.Side)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.AccountType)
               .IsRequired()
               .HasMaxLength(10);

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

        builder.Property(x => x.AccountId)
               .IsRequired();

        builder.Property(x => x.AccountBranch)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Method)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.Reference)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.CheckNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.ChargeAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.HasIndex(x => x.FundTransferId)
               .HasDatabaseName("IX_FundTransferLines_Voucher");

        // Ledger reports : rows of a ledger
        builder.HasIndex(x => x.LedgerCode)
               .HasDatabaseName("IX_FundTransferLines_Ledger");
    }
}