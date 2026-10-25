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
// Payment Voucher Configuration
//
// One class configures the header, its lines and its payments
// (the database engine creates / drops all three together).
// Debits = Lines (Pay To), Credits = Payments (Payment Mode).
//===============================================================

public class PaymentVoucherConfiguration
    : IEntityTypeConfiguration<PaymentVoucher>,
      IEntityTypeConfiguration<PaymentVoucherLines>,
      IEntityTypeConfiguration<PaymentVoucherPayments>
{
    //===========================================================
    // Header
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PaymentVoucher> builder)
    {
        builder.ToTable("PaymentVoucher");

        builder.HasKey(x => x.PaymentVoucherId);

        builder.Property(x => x.PaymentVoucherId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        // Numbers are never reused (deleted drafts included)
        builder.HasIndex(x => x.VoucherNo)
               .IsUnique()
               .HasDatabaseName("UX_PaymentVoucher_VoucherNo");

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

        builder.Property(x => x.CompanyCharges)
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
               .HasDatabaseName("IX_PaymentVoucher_Date_Branch");

        builder.HasIndex(x => x.Status)
               .HasDatabaseName("IX_PaymentVoucher_Status");
    }


    //===========================================================
    // Lines
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PaymentVoucherLines> builder)
    {
        builder.ToTable("PaymentVoucherLines");

        builder.HasKey(x => x.PaymentVoucherLineId);

        builder.Property(x => x.PaymentVoucherLineId)
               .ValueGeneratedOnAdd();

        builder.HasOne<PaymentVoucher>()
               .WithMany()
               .HasForeignKey(x => x.PaymentVoucherId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.LineNo)
               .IsRequired();

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

        builder.HasIndex(x => x.PaymentVoucherId)
               .HasDatabaseName("IX_PaymentVoucherLines_Voucher");
    }


    //===========================================================
    // Payments
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PaymentVoucherPayments> builder)
    {
        builder.ToTable("PaymentVoucherPayments");

        builder.HasKey(x => x.PaymentVoucherPaymentId);

        builder.Property(x => x.PaymentVoucherPaymentId)
               .ValueGeneratedOnAdd();

        builder.HasOne<PaymentVoucher>()
               .WithMany()
               .HasForeignKey(x => x.PaymentVoucherId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.LineNo)
               .IsRequired();

        builder.Property(x => x.Mode)
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

        builder.Property(x => x.Amount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.ChargePercent)
               .IsRequired()
               .HasPrecision(7, 2);

        builder.Property(x => x.ChargeAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.ChargeBorneBy)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.TransactionRef)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.PayeeName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.PayeeAccount)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.CheckNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.CheckBank)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.CheckStatus)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.ClearedVoucherNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.HasIndex(x => x.PaymentVoucherId)
               .HasDatabaseName("IX_PaymentVoucherPayments_Voucher");

        // Check Reconciliation : pending checks
        builder.HasIndex(x => new { x.Mode, x.CheckStatus })
               .HasDatabaseName("IX_PaymentVoucherPayments_Check");
    }
}