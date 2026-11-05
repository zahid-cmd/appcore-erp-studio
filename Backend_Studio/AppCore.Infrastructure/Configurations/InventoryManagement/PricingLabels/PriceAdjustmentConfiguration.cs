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
// Price Adjustment : header, products, lines (batches), supplier
// groups, releases. Applied because PriceAdjustment has its DbSet
// (the first interface below); each child also gets its own DbSet
// (AppDbContext, outside the AUTO blocks).
//===============================================================

public class PriceAdjustmentConfiguration
    : IEntityTypeConfiguration<PriceAdjustment>,
      IEntityTypeConfiguration<PriceAdjustmentProducts>,
      IEntityTypeConfiguration<PriceAdjustmentLines>,
      IEntityTypeConfiguration<PriceAdjustmentSuppliers>,
      IEntityTypeConfiguration<PriceAdjustmentReleases>
{
    public void Configure(
        EntityTypeBuilder<PriceAdjustment> builder)
    {
        builder.ToTable("PriceAdjustments");

        builder.HasKey(x => x.PriceAdjustmentId);

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_PriceAdjustments_PublicId");

        builder.Property(x => x.PriceAdjustmentId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.AdjustmentNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SequenceNo).IsRequired();
        builder.Property(x => x.PageType).IsRequired().HasMaxLength(2);
        builder.Property(x => x.BranchId).IsRequired();
        builder.Property(x => x.CircularRef).IsRequired().HasMaxLength(100);
        builder.Property(x => x.CircularDate);
        builder.Property(x => x.CutOffDate).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.IncreaseAmount).HasPrecision(18, 2);
        builder.Property(x => x.ReductionAmount).HasPrecision(18, 2);
        builder.Property(x => x.NetAmount).HasPrecision(18, 2);
        builder.Property(x => x.VoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();

        builder.HasIndex(x => x.AdjustmentNo).IsUnique();
    }

    public void Configure(
        EntityTypeBuilder<PriceAdjustmentProducts> builder)
    {
        builder.ToTable("PriceAdjustmentProducts");

        builder.HasKey(x => x.PriceAdjustmentProductId);

        builder.Property(x => x.PriceAdjustmentProductId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PriceAdjustmentId).IsRequired();
        builder.Property(x => x.LineNo).IsRequired();
        builder.Property(x => x.ProductId).IsRequired();
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.PartNumber).IsRequired().HasMaxLength(100);
        builder.Property(x => x.OldMrp).HasPrecision(18, 2);
        builder.Property(x => x.NewMrp).HasPrecision(18, 2);
        builder.Property(x => x.Direction).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Quantity).HasPrecision(18, 4);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
    }

    public void Configure(
        EntityTypeBuilder<PriceAdjustmentLines> builder)
    {
        builder.ToTable("PriceAdjustmentLines");

        builder.HasKey(x => x.PriceAdjustmentLineId);

        builder.Property(x => x.PriceAdjustmentLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PriceAdjustmentId).IsRequired();
        builder.Property(x => x.ProductId).IsRequired();
        builder.Property(x => x.StockBatchId).IsRequired();
        builder.Property(x => x.BatchNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SupplierCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SupplierName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.VatRate).HasPrecision(9, 4);
        builder.Property(x => x.Quantity).HasPrecision(18, 4);
        builder.Property(x => x.SoldSinceCutOff).HasPrecision(18, 4);
        builder.Property(x => x.ReleasedQuantity).HasPrecision(18, 4);
        builder.Property(x => x.UnitCost).HasPrecision(18, 4);
        builder.Property(x => x.OldMrp).HasPrecision(18, 2);
        builder.Property(x => x.NewMrp).HasPrecision(18, 2);
        builder.Property(x => x.MarginPercent).HasPrecision(9, 4);
        builder.Property(x => x.NewUnitCost).HasPrecision(18, 4);
        builder.Property(x => x.DifferencePerUnit).HasPrecision(18, 4);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
    }

    public void Configure(
        EntityTypeBuilder<PriceAdjustmentSuppliers> builder)
    {
        builder.ToTable("PriceAdjustmentSuppliers");

        builder.HasKey(x => x.PriceAdjustmentSupplierId);

        builder.Property(x => x.PriceAdjustmentSupplierId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PriceAdjustmentId).IsRequired();
        builder.Property(x => x.SupplierCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SupplierName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.IncreaseTo).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ReductionTo).IsRequired().HasMaxLength(20);
        builder.Property(x => x.IncreaseAmount).HasPrecision(18, 2);
        builder.Property(x => x.ReductionAmount).HasPrecision(18, 2);
    }

    public void Configure(
        EntityTypeBuilder<PriceAdjustmentReleases> builder)
    {
        builder.ToTable("PriceAdjustmentReleases");

        builder.HasKey(x => x.PriceAdjustmentReleaseId);

        builder.Property(x => x.PriceAdjustmentReleaseId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PriceAdjustmentLineId).IsRequired();
        builder.Property(x => x.PriceAdjustmentId).IsRequired();
        builder.Property(x => x.StockBatchId).IsRequired();
        builder.Property(x => x.Quantity).HasPrecision(18, 4);
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.SourceType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SourceNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ReleaseDate).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
