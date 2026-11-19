//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.ServiceOperations;


//===============================================================
// Service Operations, service billing : EF configuration (tables
// made by ServiceOperations_Billing_Engine.sql; hand-written pages,
// no Code Sync). No database defaults for booleans.
//===============================================================

public class ServiceBillingConfigurations
    : IEntityTypeConfiguration<ServiceInvoices>,
      IEntityTypeConfiguration<ServiceInvoiceLines>,
      IEntityTypeConfiguration<ServiceInvoicePayments>,
      IEntityTypeConfiguration<ServiceReturns>,
      IEntityTypeConfiguration<FreeServiceClaims>
{
    public void Configure(EntityTypeBuilder<ServiceInvoices> builder)
    {
        builder.ToTable("ServiceInvoices");

        builder.HasKey(x => x.ServiceInvoiceId);

        builder.Property(x => x.ServiceInvoiceId).ValueGeneratedOnAdd();
        builder.Property(x => x.InvoiceNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.JobType).IsRequired().HasMaxLength(30);
        builder.Property(x => x.CustomerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Mobile).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ReceivableLedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.LabourTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PartsTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.OutsideTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.VatTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Discount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.LineDiscount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.GrandTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PaidAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PartsCost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ReceiptVoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(15);
        builder.Property(x => x.IsDelivered).IsRequired();
        builder.Property(x => x.ReturnNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
    }

    public void Configure(EntityTypeBuilder<ServiceInvoiceLines> builder)
    {
        builder.ToTable("ServiceInvoiceLines");

        builder.HasKey(x => x.ServiceInvoiceLineId);

        builder.Property(x => x.ServiceInvoiceLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.LineType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Rate).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.DiscountText).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Discount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.IsFree).IsRequired();
        builder.Property(x => x.ClaimAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ClaimLedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.VatRate).IsRequired().HasPrecision(9, 4);
        builder.Property(x => x.VatAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Total).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Cost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.IncomeLedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }

    public void Configure(EntityTypeBuilder<ServiceInvoicePayments> builder)
    {
        builder.ToTable("ServiceInvoicePayments");

        builder.HasKey(x => x.ServiceInvoicePaymentId);

        builder.Property(x => x.ServiceInvoicePaymentId).ValueGeneratedOnAdd();
        builder.Property(x => x.Mode).IsRequired().HasMaxLength(10);
        builder.Property(x => x.LedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.LedgerName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TransactionRef).IsRequired().HasMaxLength(100);
    }

    public void Configure(EntityTypeBuilder<ServiceReturns> builder)
    {
        builder.ToTable("ServiceReturns");

        builder.HasKey(x => x.ServiceReturnId);

        builder.Property(x => x.ServiceReturnId).ValueGeneratedOnAdd();
        builder.Property(x => x.ReturnNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Reason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.ReceiptCancelled).IsRequired();
        builder.Property(x => x.PartsReturned).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FreeServiceClaims> builder)
    {
        builder.ToTable("FreeServiceClaims");

        builder.HasKey(x => x.FreeServiceClaimId);

        builder.Property(x => x.FreeServiceClaimId).ValueGeneratedOnAdd();
        builder.Property(x => x.ClaimNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.TotalAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(15);
        builder.Property(x => x.SettledLedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SettledLedgerName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.SettlementNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SettlementRef).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
    }
}
