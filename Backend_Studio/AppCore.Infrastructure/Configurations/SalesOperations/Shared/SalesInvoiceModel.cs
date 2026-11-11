//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.Shared;


//===============================================================
// Sales invoice model : columns and sizes shared by every Sales
// Invoices page (tables made by SalesInvoices_Engine.sql). Each
// page's configuration calls these with its own table names.
//===============================================================

public static class SalesInvoiceModel
{
    //===========================================================
    // Header
    //===========================================================

    public static void ConfigureHeader<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : SalesInvoiceHeader
    {
        builder.ToTable(table);

        builder.HasKey(x => x.SalesInvoiceId);

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName($"UX_{table}_PublicId");

        builder.Property(x => x.SalesInvoiceId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PageType)
               .IsRequired()
               .HasMaxLength(5);
        builder.Property(x => x.InvoiceNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.InvoiceDate)
               .IsRequired();
        builder.Property(x => x.BranchId)
               .IsRequired();
        builder.Property(x => x.BranchCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(150);
        builder.Property(x => x.FinancialYearId)
               .IsRequired();
        builder.Property(x => x.WarehouseId)
               .IsRequired();
        builder.Property(x => x.WarehouseName)
               .IsRequired()
               .HasMaxLength(150);
        builder.Property(x => x.SalesPersonId);
        builder.Property(x => x.SalesPersonName)
               .IsRequired()
               .HasMaxLength(150);
        builder.Property(x => x.CustomerId)
               .IsRequired();
        builder.Property(x => x.CustomerCode)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.CustomerName)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.CustomerPhone)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.CustomerAddress)
               .IsRequired()
               .HasMaxLength(500);
        builder.Property(x => x.CustomerType)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.CustomerIsWalkIn)
               .IsRequired();
        builder.Property(x => x.ReceivableLedgerCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.MembershipId);
        builder.Property(x => x.MembershipNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.MembershipCardName)
               .IsRequired()
               .HasMaxLength(100);
        builder.Property(x => x.MembershipDiscountPercent)
               .HasPrecision(7, 2);
        builder.Property(x => x.MembershipDiscountLedgerCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.VatApplicable)
               .IsRequired();
        builder.Property(x => x.InvoiceSpecialType)
               .IsRequired()
               .HasMaxLength(10);
        builder.Property(x => x.InvoiceSpecialValue)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalQuantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.GrossAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.CampaignDiscount)
               .HasPrecision(18, 2);
        builder.Property(x => x.MembershipDiscount)
               .HasPrecision(18, 2);
        builder.Property(x => x.SpecialDiscount)
               .HasPrecision(18, 2);
        builder.Property(x => x.FractionalDiscount)
               .HasPrecision(18, 2);
        builder.Property(x => x.InvoiceTotal)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalVatInside)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalBaseVat)
               .HasPrecision(18, 2);
        builder.Property(x => x.CostAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.PaidAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.DueAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(500);
        builder.Property(x => x.PaymentTerm)
               .IsRequired()
               .HasMaxLength(10);
        builder.Property(x => x.EmiAccountCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.EmiAccountName)
               .IsRequired()
               .HasMaxLength(250);
        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.ReceiptVoucherId);
        builder.Property(x => x.ReceiptVoucherNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.CancelReason)
               .IsRequired()
               .HasMaxLength(500);
        builder.Property(x => x.CreatedBy)
               .IsRequired();
        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }


    //===========================================================
    // Line
    //===========================================================

    public static void ConfigureLine<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : SalesInvoiceLine
    {
        builder.ToTable(table);

        builder.HasKey(x => x.SalesInvoiceLineId);

        builder.Property(x => x.SalesInvoiceLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.SalesInvoiceId)
               .IsRequired();
        builder.Property(x => x.LineNo)
               .IsRequired();
        builder.Property(x => x.ProductType)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.ProductId)
               .IsRequired();
        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(40);
        builder.Property(x => x.PartNumber)
               .IsRequired()
               .HasMaxLength(100);
        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(250);
        builder.Property(x => x.Unit)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.Mrp)
               .HasPrecision(18, 2);
        builder.Property(x => x.MrpText)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.UnitPrice)
               .HasPrecision(18, 4);
        builder.Property(x => x.GrossAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.DiscountSource)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.DiscountLabel)
               .IsRequired()
               .HasMaxLength(100);
        builder.Property(x => x.CampaignMembershipPercent)
               .HasPrecision(7, 2);
        builder.Property(x => x.CampaignMembershipAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.SpecialDiscountPercent)
               .HasPrecision(7, 2);
        builder.Property(x => x.SpecialDiscountTk)
               .HasPrecision(18, 2);
        builder.Property(x => x.SpecialAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.NetAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.FractionalShare)
               .HasPrecision(18, 2);
        builder.Property(x => x.LineTotal)
               .HasPrecision(18, 2);
        builder.Property(x => x.VatRate)
               .HasPrecision(7, 2);
        builder.Property(x => x.VatInside)
               .HasPrecision(18, 2);
        builder.Property(x => x.BaseVat)
               .HasPrecision(18, 2);
        builder.Property(x => x.CostAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.PriceAdjustmentShare)
               .HasPrecision(18, 2);
        builder.Property(x => x.UnallocatedQuantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.PlannedAllocations)
               .IsRequired();
        builder.Property(x => x.ReturnedQuantity)
               .HasPrecision(18, 2);
    }


    //===========================================================
    // Payment (Payment Desk row)
    //===========================================================

    public static void ConfigurePayment<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : SalesInvoicePayment
    {
        builder.ToTable(table);

        builder.HasKey(x => x.SalesInvoicePaymentId);

        builder.Property(x => x.SalesInvoicePaymentId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.SalesInvoiceId)
               .IsRequired();
        builder.Property(x => x.LineNo)
               .IsRequired();
        builder.Property(x => x.Mode)
               .IsRequired()
               .HasMaxLength(10);
        builder.Property(x => x.LedgerType)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.SubGroupCode)
               .IsRequired()
               .HasMaxLength(40);
        builder.Property(x => x.SubGroupName)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.LedgerName)
               .IsRequired()
               .HasMaxLength(250);
        builder.Property(x => x.AccountId)
               .IsRequired();
        builder.Property(x => x.Amount)
               .HasPrecision(18, 2);
        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(250);
        builder.Property(x => x.ChargePercent)
               .HasPrecision(7, 2);
        builder.Property(x => x.ChargeAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.ChargeBorneBy)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.CardSetupId)
               .IsRequired();
        builder.Property(x => x.CardName)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.TransactionRef)
               .IsRequired()
               .HasMaxLength(100);
        builder.Property(x => x.TenureMonths)
               .IsRequired();
        builder.Property(x => x.InterestPercent)
               .HasPrecision(7, 2);
        builder.Property(x => x.InterestAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalCharged)
               .HasPrecision(18, 2);
        builder.Property(x => x.CheckNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.CheckDate);
        builder.Property(x => x.CheckBank)
               .IsRequired()
               .HasMaxLength(200);
    }
}
