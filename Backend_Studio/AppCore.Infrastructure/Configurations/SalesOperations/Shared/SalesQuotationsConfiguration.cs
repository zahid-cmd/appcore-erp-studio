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
// Sales Quotations / lines : EF configuration (tables made by
// SalesQuotations_Engine.sql; hand-written pages)
//===============================================================

public class SalesQuotationsConfiguration
    : IEntityTypeConfiguration<SalesQuotations>
{
    public void Configure(EntityTypeBuilder<SalesQuotations> builder)
    {
        builder.ToTable("SalesQuotations");

        builder.HasKey(x => x.SalesQuotationId);

        builder.Property(x => x.SalesQuotationId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_SalesQuotations_PublicId");

        builder.Property(x => x.ProductType).IsRequired().HasMaxLength(2);

        builder.Property(x => x.QuotationNo).IsRequired().HasMaxLength(40);

        builder.HasIndex(x => x.QuotationNo).IsUnique().HasDatabaseName("UX_SalesQuotations_No");

        builder.Property(x => x.QuotationDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.ValidUntil).HasColumnType("date");

        builder.Property(x => x.SalesPersonName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.CustomerCode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.CustomerPhone).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CustomerAddress).IsRequired().HasMaxLength(500);

        builder.Property(x => x.SaleType).IsRequired().HasMaxLength(10);

        builder.Property(x => x.InvoiceSpecialType).IsRequired().HasMaxLength(10);

        builder.Property(x => x.InvoiceSpecialValue).HasPrecision(18, 2);

        builder.Property(x => x.FractionalDiscount).HasPrecision(18, 2);

        builder.Property(x => x.TotalQuantity).HasPrecision(18, 2);

        builder.Property(x => x.GrossAmount).HasPrecision(18, 2);

        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2);

        builder.Property(x => x.QuotationTotal).HasPrecision(18, 2);

        builder.Property(x => x.TotalVatInside).HasPrecision(18, 2);

        builder.Property(x => x.Narration).IsRequired().HasMaxLength(500);

        builder.Property(x => x.Terms).IsRequired().HasMaxLength(1000);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);

        builder.Property(x => x.SalesInvoiceNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ConvertedDate).HasColumnType("date");

        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
    }
}


public class SalesQuotationLinesConfiguration
    : IEntityTypeConfiguration<SalesQuotationLines>
{
    public void Configure(EntityTypeBuilder<SalesQuotationLines> builder)
    {
        builder.ToTable("SalesQuotationLines");

        builder.HasKey(x => x.SalesQuotationLineId);

        builder.Property(x => x.SalesQuotationLineId).ValueGeneratedOnAdd();

        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(50);

        builder.Property(x => x.PartNumber).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);

        builder.Property(x => x.Unit).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Quantity).HasPrecision(18, 2);

        builder.Property(x => x.TypedPrice).HasPrecision(18, 2);

        builder.Property(x => x.TypedSpecialPercent).HasPrecision(9, 2);

        builder.Property(x => x.TypedSpecialTk).HasPrecision(18, 2);

        builder.Property(x => x.Mrp).HasPrecision(18, 2);

        builder.Property(x => x.UnitPrice).HasPrecision(18, 4);

        builder.Property(x => x.GrossAmount).HasPrecision(18, 2);

        builder.Property(x => x.DiscountLabel).IsRequired().HasMaxLength(100);

        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2);

        builder.Property(x => x.NetAmount).HasPrecision(18, 2);

        builder.Property(x => x.VatInside).HasPrecision(18, 2);

        builder.HasIndex(x => x.SalesQuotationId).HasDatabaseName("IX_SalesQuotationLines_Quotation");
    }
}
