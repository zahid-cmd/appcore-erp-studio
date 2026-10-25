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
// Check Reconciliations Configuration
//
// One class configures the check state and everything around it
// (history, RRV / RRP clearing vouchers and their lines, deposit
// slips). CheckReconciliations comes FIRST : AppDbContext applies
// this class because that entity has a DbSet, and the others come
// in with it.
//===============================================================

public class CheckReconciliationsConfiguration
    : IEntityTypeConfiguration<CheckReconciliations>,
      IEntityTypeConfiguration<CheckReconciliationHistory>,
      IEntityTypeConfiguration<CheckReconciliationVouchers>,
      IEntityTypeConfiguration<CheckReconciliationVoucherLines>,
      IEntityTypeConfiguration<CheckDepositSlips>
{
    //===========================================================
    // Check state (one row per check)
    //===========================================================

    public void Configure(
        EntityTypeBuilder<CheckReconciliations> builder)
    {
        builder.ToTable("CheckReconciliations");

        builder.HasKey(x => x.CheckReconciliationId);

        builder.Property(x => x.CheckReconciliationId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Direction)
               .IsRequired()
               .HasMaxLength(10);

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

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.CheckNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.CheckBank)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.PartyName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.AccountLedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.AccountLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.DepositSlipNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.DepositLedgerCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.DepositLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.ClearingVoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.ClearingCharge)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.DishonourReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.DishonourFee)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.DishonourRecovery)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.DishonourVoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.DishonourCount)
               .IsRequired();

        builder.Property(x => x.VoidReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        // One row per check of a voucher
        builder.HasIndex(x => new { x.Direction, x.SourcePaymentId })
               .IsUnique()
               .HasDatabaseName("UX_CheckReconciliations_Source");

        builder.HasIndex(x => x.Status)
               .HasDatabaseName("IX_CheckReconciliations_Status");

        builder.HasIndex(x => x.ClearingVoucherNo)
               .HasDatabaseName("IX_CheckReconciliations_Clearing");
    }


    //===========================================================
    // History
    //===========================================================

    public void Configure(
        EntityTypeBuilder<CheckReconciliationHistory> builder)
    {
        builder.ToTable("CheckReconciliationHistory");

        builder.HasKey(x => x.CheckReconciliationHistoryId);

        builder.Property(x => x.CheckReconciliationHistoryId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.CheckReconciliationId)
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

        builder.Property(x => x.DepositSlipNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.Charge)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Recovery)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Reason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.PerformedBy)
               .IsRequired();

        builder.Property(x => x.PerformedDate)
               .IsRequired();

        builder.HasIndex(x => x.CheckReconciliationId)
               .HasDatabaseName("IX_CheckReconciliationHistory_Check");
    }


    //===========================================================
    // Clearing / dishonour vouchers (RRV / RRP)
    //===========================================================

    public void Configure(
        EntityTypeBuilder<CheckReconciliationVouchers> builder)
    {
        builder.ToTable("CheckReconciliationVouchers");

        builder.HasKey(x => x.CheckReconciliationVoucherId);

        builder.Property(x => x.CheckReconciliationVoucherId)
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

        builder.Property(x => x.CheckCount)
               .IsRequired();

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Charges)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Recovery)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(500);

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
               .HasDatabaseName("UX_CheckReconciliationVouchers_VoucherNo");
    }


    //===========================================================
    // Voucher lines
    //===========================================================

    public void Configure(
        EntityTypeBuilder<CheckReconciliationVoucherLines> builder)
    {
        builder.ToTable("CheckReconciliationVoucherLines");

        builder.HasKey(x => x.CheckReconciliationVoucherLineId);

        builder.Property(x => x.CheckReconciliationVoucherLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.CheckReconciliationVoucherId)
               .IsRequired();

        builder.Property(x => x.LineNo)
               .IsRequired();

        builder.Property(x => x.GroupNo)
               .IsRequired();

        builder.Property(x => x.CheckNo)
               .IsRequired()
               .HasMaxLength(50);

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

        builder.HasIndex(x => x.CheckReconciliationVoucherId)
               .HasDatabaseName("IX_CheckReconciliationVoucherLines_Voucher");
    }


    //===========================================================
    // Deposit slips
    //===========================================================

    public void Configure(
        EntityTypeBuilder<CheckDepositSlips> builder)
    {
        builder.ToTable("CheckDepositSlips");

        builder.HasKey(x => x.CheckDepositSlipId);

        builder.Property(x => x.CheckDepositSlipId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.SlipNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.SlipDate)
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

        builder.Property(x => x.CheckCount)
               .IsRequired();

        builder.Property(x => x.TotalAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.HasIndex(x => x.SlipNo)
               .IsUnique()
               .HasDatabaseName("UX_CheckDepositSlips_SlipNo");
    }
}