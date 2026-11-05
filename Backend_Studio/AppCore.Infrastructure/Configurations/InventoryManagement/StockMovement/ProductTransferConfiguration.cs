//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InventoryManagement.StockMovement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer : header, lines, batches, bikes. Applied
// because ProductTransfer has its DbSet (the first interface
// below); each child also gets its own DbSet (AppDbContext,
// outside the AUTO blocks).
//===============================================================

public class ProductTransferConfiguration
    : IEntityTypeConfiguration<ProductTransfer>,
      IEntityTypeConfiguration<ProductTransferLines>,
      IEntityTypeConfiguration<ProductTransferBatches>,
      IEntityTypeConfiguration<ProductTransferUnits>
{
    public void Configure(
        EntityTypeBuilder<ProductTransfer> builder)
    {
        builder.ToTable("ProductTransfers");

        builder.HasKey(x => x.ProductTransferId);

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_ProductTransfers_PublicId");

        builder.Property(x => x.ProductTransferId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.TransferNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SequenceNo).IsRequired();
        builder.Property(x => x.PageType).IsRequired().HasMaxLength(2);
        builder.Property(x => x.TransferDate).IsRequired();
        builder.Property(x => x.FromWarehouseId).IsRequired();
        builder.Property(x => x.FromBranchId).IsRequired();
        builder.Property(x => x.ToWarehouseId).IsRequired();
        builder.Property(x => x.ToBranchId).IsRequired();
        builder.Property(x => x.IsInterBranch).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.TotalQuantity).HasPrecision(18, 4);
        builder.Property(x => x.TotalValue).HasPrecision(18, 2);
        builder.Property(x => x.VoucherNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ReceiveDate);
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();

        builder.HasIndex(x => x.TransferNo).IsUnique();
    }

    public void Configure(
        EntityTypeBuilder<ProductTransferLines> builder)
    {
        builder.ToTable("ProductTransferLines");

        builder.HasKey(x => x.ProductTransferLineId);

        builder.Property(x => x.ProductTransferLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ProductTransferId).IsRequired();
        builder.Property(x => x.LineNo).IsRequired();
        builder.Property(x => x.ProductId).IsRequired();
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.PartNumber).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Quantity).HasPrecision(18, 4);
        builder.Property(x => x.UnitCostAvg).HasPrecision(18, 4);
        builder.Property(x => x.Value).HasPrecision(18, 2);
        builder.Property(x => x.ToRackId);
        builder.Property(x => x.ToShelfNo);
        builder.Property(x => x.ToBinNo);
        builder.Property(x => x.SavePlace).IsRequired();
        builder.Property(x => x.Notes).IsRequired().HasMaxLength(200);
    }

    public void Configure(
        EntityTypeBuilder<ProductTransferBatches> builder)
    {
        builder.ToTable("ProductTransferBatches");

        builder.HasKey(x => x.ProductTransferBatchId);

        builder.Property(x => x.ProductTransferBatchId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ProductTransferId).IsRequired();
        builder.Property(x => x.ProductTransferLineId).IsRequired();
        builder.Property(x => x.StockBatchId).IsRequired();
        builder.Property(x => x.BatchNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.Quantity).HasPrecision(18, 4);
        builder.Property(x => x.UnitCost).HasPrecision(18, 4);
        builder.Property(x => x.Value).HasPrecision(18, 2);
    }

    public void Configure(
        EntityTypeBuilder<ProductTransferUnits> builder)
    {
        builder.ToTable("ProductTransferUnits");

        builder.HasKey(x => x.ProductTransferUnitId);

        builder.Property(x => x.ProductTransferUnitId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ProductTransferId).IsRequired();
        builder.Property(x => x.ProductTransferLineId).IsRequired();
        builder.Property(x => x.MotorBikeUnitId).IsRequired();
        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(60);
        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(60);
        builder.Property(x => x.StockBatchId).IsRequired();
    }
}
