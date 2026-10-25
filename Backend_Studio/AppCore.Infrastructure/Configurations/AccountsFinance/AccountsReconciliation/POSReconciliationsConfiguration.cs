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
// POS Reconciliations Configuration
//
// One class configures the POS line state and everything around
// it (history, RRV settlement / reject vouchers and their lines,
// the Auto Settlement run log). PosReconciliations comes FIRST :
// AppDbContext applies this class because that entity has a
// DbSet (PosReconciliationss, from Code Sync), and the others
// come in with it.
//===============================================================

public class PosReconciliationsConfiguration
    : IEntityTypeConfiguration<PosReconciliations>,
      IEntityTypeConfiguration<PosReconciliationHistory>,
      IEntityTypeConfiguration<PosReconciliationVouchers>,
      IEntityTypeConfiguration<PosReconciliationVoucherLines>,
      IEntityTypeConfiguration<PosAutoSettlementRuns>
{
    //===========================================================
    // State (one row per Receipt Voucher POS line)
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PosReconciliations> builder)
    {
        builder.ToTable("PosReconciliations");

        builder.HasKey(x => x.PosReconciliationId);

        builder.Property(x => x.PosReconciliationId)
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

        builder.Property(x => x.AccountCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.AccountName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.CardName)
               .IsRequired()
               .HasMaxLength(150);

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

        builder.Property(x => x.SaleChargePercent)
               .IsRequired()
               .HasPrecision(9, 4);

        builder.Property(x => x.SaleChargeAmount)
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

        // One row per POS line of a voucher
        builder.HasIndex(x => new { x.SourceVoucherType, x.SourcePaymentId })
               .IsUnique()
               .HasDatabaseName("UX_PosReconciliations_Source");

        builder.HasIndex(x => x.Status)
               .HasDatabaseName("IX_PosReconciliations_Status");

        builder.HasIndex(x => new { x.SourceVoucherType, x.SourceVoucherId })
               .HasDatabaseName("IX_PosReconciliations_Voucher");
    }


    //===========================================================
    // History
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PosReconciliationHistory> builder)
    {
        builder.ToTable("PosReconciliationHistory");

        builder.HasKey(x => x.PosReconciliationHistoryId);

        builder.Property(x => x.PosReconciliationHistoryId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PosReconciliationId)
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

        builder.HasIndex(x => x.PosReconciliationId)
               .HasDatabaseName("IX_PosReconciliationHistory_Line");
    }


    //===========================================================
    // Settlement / reject vouchers (RRV)
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PosReconciliationVouchers> builder)
    {
        builder.ToTable("PosReconciliationVouchers");

        builder.HasKey(x => x.PosReconciliationVoucherId);

        builder.Property(x => x.PosReconciliationVoucherId)
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
               .HasDatabaseName("UX_PosReconciliationVouchers_VoucherNo");
    }


    //===========================================================
    // Voucher lines
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PosReconciliationVoucherLines> builder)
    {
        builder.ToTable("PosReconciliationVoucherLines");

        builder.HasKey(x => x.PosReconciliationVoucherLineId);

        builder.Property(x => x.PosReconciliationVoucherLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PosReconciliationVoucherId)
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

        builder.HasIndex(x => x.PosReconciliationVoucherId)
               .HasDatabaseName("IX_PosReconciliationVoucherLines_Voucher");
    }


    //===========================================================
    // Auto Settlement run log
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PosAutoSettlementRuns> builder)
    {
        builder.ToTable("PosAutoSettlementRuns");

        builder.HasKey(x => x.PosAutoSettlementRunId);

        builder.Property(x => x.PosAutoSettlementRunId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.RunDate)
               .IsRequired();

        builder.Property(x => x.BankLedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.BankLedgerName)
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
        // IX_PosAutoSettlementRuns_Date)
        builder.HasIndex(x => x.RunDate)
               .IsUnique()
               .HasFilter("\"Outcome\" = 'Completed'")
               .HasDatabaseName("UX_PosAutoSettlementRuns_Completed");
    }
}