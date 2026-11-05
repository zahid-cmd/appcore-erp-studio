//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InventoryManagement.PricingLabels;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing : header + lines. The lines have no DbSet; they
// enter the model through this configuration (applied because
// ProductPricing has its DbSet).
//===============================================================

public class ProductPricingConfiguration
    : IEntityTypeConfiguration<ProductPricing>,
      IEntityTypeConfiguration<ProductPricingLines>
{
    public void Configure(
        EntityTypeBuilder<ProductPricing> builder)
    {
        builder.ToTable("ProductPricing");

        builder.HasKey(x => x.ProductPricingId);

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_ProductPricing_PublicId");

        builder.Property(x => x.ProductPricingId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PageType).IsRequired().HasMaxLength(5);
        builder.Property(x => x.PricingNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.PricingDate).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.PricingKind).IsRequired().HasMaxLength(10);
        builder.Property(x => x.PurchaseNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SupplierCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SupplierName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.PricingBasis).IsRequired().HasMaxLength(10);
        builder.Property(x => x.BasisPercent).HasPrecision(9, 4);
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(
        EntityTypeBuilder<ProductPricingLines> builder)
    {
        builder.ToTable("ProductPricingLines");

        builder.HasKey(x => x.ProductPricingLineId);

        builder.Property(x => x.ProductPricingLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ProductPricingId).IsRequired();
        builder.Property(x => x.LineNo).IsRequired();
        builder.Property(x => x.ProductId).IsRequired();
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(30);
        builder.Property(x => x.StockBatchId).IsRequired();
        builder.Property(x => x.BatchNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SourceType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SourceNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitCost).HasPrecision(18, 4);
        builder.Property(x => x.OldMrp).HasPrecision(18, 2);
        builder.Property(x => x.NewMrp).HasPrecision(18, 2);
        builder.Property(x => x.Notes).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ReceivedQuantity).HasPrecision(18, 2);
        builder.Property(x => x.ProfitPercent).HasPrecision(9, 4);
        builder.Property(x => x.SuggestedMrp).HasPrecision(18, 2);
        builder.Property(x => x.SupplierCode).IsRequired().HasMaxLength(40);
    }
}
