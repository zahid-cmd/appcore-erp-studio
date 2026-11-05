//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.Shared;


//===============================================================
// Purchase Order model : columns, sizes and indexes shared by
// every Purchase Order page. Each page's configuration calls
// these with its own table name (PurchaseOrdersMb / …Sp / …Ac).
//===============================================================

public static class PurchaseOrderModel
{
    //===========================================================
    // Header
    //===========================================================

    public static void ConfigureHeader<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : PurchaseOrderHeader
    {
        builder.ToTable(table);

        builder.HasKey(x => x.PurchaseOrderId);

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName($"UX_{table}_PublicId");

        builder.Property(x => x.PurchaseOrderId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PageType)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.OrderNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.HasIndex(x => x.OrderNo)
               .IsUnique()
               .HasDatabaseName($"UX_{table}_OrderNo");

        builder.HasIndex(x => new { x.PageType, x.OrderDate })
               .HasDatabaseName($"IX_{table}_Page_Date");

        builder.Property(x => x.OrderDate)
               .IsRequired();

        builder.Property(x => x.ExpectedDate);

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.BranchCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.FinancialYearId)
               .IsRequired();

        builder.Property(x => x.SupplierCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.HasIndex(x => x.SupplierCode)
               .HasDatabaseName($"IX_{table}_Supplier");

        builder.Property(x => x.SupplierName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.PriceIncludesVat)
               .IsRequired();

        builder.Property(x => x.InvoicePriceBasis)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.ProfitBasis)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.DefaultProfitPercent)
               .HasPrecision(7, 2);

        builder.Property(x => x.AdditionalDiscountType)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.AdditionalDiscountValue)
               .HasPrecision(18, 2);

        builder.Property(x => x.AdditionalDiscountAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.RoundingMethod)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.WholeTakaLines)
               .IsRequired();

        builder.Property(x => x.RoundingAdjustment)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalFreeQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.PurchaseVatApplicable)
               .IsRequired();

        builder.Property(x => x.SalesVatApplicable)
               .IsRequired();

        builder.Property(x => x.NoVatInvoice)
               .IsRequired();

        builder.Property(x => x.VatCharged)
               .IsRequired();

        builder.Property(x => x.TotalMrp)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalProfit)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalDp)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalVat)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalPayable)
               .HasPrecision(18, 2);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.CloseReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }


    //===========================================================
    // Lines
    //===========================================================

    public static void ConfigureLine<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : PurchaseOrderLine
    {
        builder.ToTable(table);

        builder.HasKey(x => x.PurchaseOrderLineId);

        builder.Property(x => x.PurchaseOrderLineId)
               .ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PurchaseOrderId)
               .HasDatabaseName($"IX_{table}_Order");

        builder.Property(x => x.ProductType)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Unit)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.UnitPrice)
               .HasPrecision(18, 4);

        builder.Property(x => x.FreeQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.Mrp)
               .HasPrecision(18, 2);

        builder.Property(x => x.ProfitPercent)
               .HasPrecision(7, 2);

        builder.Property(x => x.IsAdjusted)
               .IsRequired();

        builder.Property(x => x.IsTotalTyped)
               .IsRequired();

        builder.Property(x => x.GrossMrp)
               .HasPrecision(18, 2);

        builder.Property(x => x.DpAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.ProfitAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.DiscountShare)
               .HasPrecision(18, 2);

        builder.Property(x => x.NetAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.RoundingShare)
               .HasPrecision(18, 2);

        builder.Property(x => x.NetUnitCost)
               .HasPrecision(18, 4);

        builder.Property(x => x.VatRate)
               .HasPrecision(5, 2);

        builder.Property(x => x.VatClaimable)
               .IsRequired();

        builder.Property(x => x.Amount)
               .HasPrecision(18, 2);

        builder.Property(x => x.VatAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.LineTotal)
               .HasPrecision(18, 2);

        builder.Property(x => x.BilledQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(250);
    }
}