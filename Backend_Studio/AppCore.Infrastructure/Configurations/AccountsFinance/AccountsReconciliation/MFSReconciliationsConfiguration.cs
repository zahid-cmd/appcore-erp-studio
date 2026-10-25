//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.AccountsFinance.AccountsReconciliation;


//===============================================================
// MFS Reconciliations Configuration
//
// One class configures the MFS line state and everything around
// it (history, RRV settlement / reject vouchers and their lines,
// the Auto Settlement run log). MfsReconciliations comes FIRST :
// AppDbContext applies this class because that entity has a
// DbSet (MfsReconciliationss, from Code Sync), and the others
// come in with it.
//===============================================================

public class MfsReconciliationsConfiguration
    : IEntityTypeConfiguration<MfsReconciliations>,
      IEntityTypeConfiguration<MfsReconciliationHistory>,
      IEntityTypeConfiguration<MfsReconciliationVouchers>,
      IEntityTypeConfiguration<MfsReconciliationVoucherLines>,
      IEntityTypeConfiguration<MfsAutoSettlementRuns>
{
    //===========================================================
    // State (one row per Receipt Voucher MFS line)
    //===========================================================

    public void Configure(
        EntityTypeBuilder<MfsReconciliations> builder)
    {
        builder.ToTable("MfsReconciliations");

        builder.HasKey(x => x.MfsReconciliationId);

        builder.Property(x => x.MfsReconciliationId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.SourceVoucherType)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.SourceVoucherId)
               .IsRequired();

        builder.Property(x => x.SourceVoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.SourcePaymentId)
               .IsRequired();

        builder.Property(x => x.ReceiptDate)
               .IsRequired();

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.PartyName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.WalletCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.WalletName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.WalletType)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.TransactionRef)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.CustomerCharge)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.GrossAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.SettlementVoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.BankLedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.BankLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.FeePercent)
               .IsRequired()
               .HasPrecision(9, 4);

        builder.Property(x => x.Fee)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.StandardFee)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.FeeEdited)
               .IsRequired();

        builder.Property(x => x.FeeReason)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.NetAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.IsAuto)
               .IsRequired();

        builder.Property(x => x.SkipAuto)
               .IsRequired();

        builder.Property(x => x.RejectReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.RejectVoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        // One row per MFS line of a voucher
        builder.HasIndex(x => new { x.SourceVoucherType, x.SourcePaymentId })
               .IsUnique()
               .HasDatabaseName("UX_MfsReconciliations_Source");

        builder.HasIndex(x => x.Status)
               .HasDatabaseName("IX_MfsReconciliations_Status");

        builder.HasIndex(x => new { x.SourceVoucherType, x.SourceVoucherId })
               .HasDatabaseName("IX_MfsReconciliations_Voucher");
    }


    //===========================================================
    // History
    //===========================================================

    public void Configure(
        EntityTypeBuilder<MfsReconciliationHistory> builder)
    {
        builder.ToTable("MfsReconciliationHistory");

        builder.HasKey(x => x.MfsReconciliationHistoryId);

        builder.Property(x => x.MfsReconciliationHistoryId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.MfsReconciliationId)
               .IsRequired();

        builder.Property(x => x.Action)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.ActionDate)
               .IsRequired();

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.LedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.Fee)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.StandardFee)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.FeeEdited)
               .IsRequired();

        builder.Property(x => x.FeeReason)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Reason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.IsAuto)
               .IsRequired();

        builder.Property(x => x.PerformedBy)
               .IsRequired();

        builder.Property(x => x.PerformedDate)
               .IsRequired();

        builder.HasIndex(x => x.MfsReconciliationId)
               .HasDatabaseName("IX_MfsReconciliationHistory_Line");
    }


    //===========================================================
    // Settlement / reject vouchers (RRV)
    //===========================================================

    public void Configure(
        EntityTypeBuilder<MfsReconciliationVouchers> builder)
    {
        builder.ToTable("MfsReconciliationVouchers");

        builder.HasKey(x => x.MfsReconciliationVoucherId);

        builder.Property(x => x.MfsReconciliationVoucherId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.VoucherType)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.Purpose)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.VoucherDate)
               .IsRequired();

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.WalletCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.WalletName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.BankLedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.BankLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.TransactionCount)
               .IsRequired();

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Charges)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.NetAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.IsAuto)
               .IsRequired();

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.ReverseReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.HasIndex(x => x.VoucherNo)
               .IsUnique()
               .HasDatabaseName("UX_MfsReconciliationVouchers_VoucherNo");
    }


    //===========================================================
    // Voucher lines
    //===========================================================

    public void Configure(
        EntityTypeBuilder<MfsReconciliationVoucherLines> builder)
    {
        builder.ToTable("MfsReconciliationVoucherLines");

        builder.HasKey(x => x.MfsReconciliationVoucherLineId);

        builder.Property(x => x.MfsReconciliationVoucherLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.MfsReconciliationVoucherId)
               .IsRequired();

        builder.Property(x => x.LineNo)
               .IsRequired();

        builder.Property(x => x.GroupNo)
               .IsRequired();

        builder.Property(x => x.TransactionRef)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.LedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.SubGroupName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.PartyCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.PartyType)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.Debit)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Credit)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.IsCharge)
               .IsRequired();

        builder.HasIndex(x => x.MfsReconciliationVoucherId)
               .HasDatabaseName("IX_MfsReconciliationVoucherLines_Voucher");
    }


    //===========================================================
    // Auto Settlement run log
    //===========================================================

    public void Configure(
        EntityTypeBuilder<MfsAutoSettlementRuns> builder)
    {
        builder.ToTable("MfsAutoSettlementRuns");

        builder.HasKey(x => x.MfsAutoSettlementRunId);

        builder.Property(x => x.MfsAutoSettlementRunId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.RunDate)
               .IsRequired();

        builder.Property(x => x.WalletCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.WalletName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.Outcome)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.TransactionCount)
               .IsRequired();

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Message)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        // One Completed row per date (the table script also adds
        // IX_MfsAutoSettlementRuns_Date)
        builder.HasIndex(x => x.RunDate)
               .IsUnique()
               .HasFilter("\"Outcome\" = 'Completed'")
               .HasDatabaseName("UX_MfsAutoSettlementRuns_Completed");
    }
}