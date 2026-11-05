//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InventoryManagement.StoreSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock : header + lines. The lines have no DbSet; they
// enter the model through this configuration (applied because
// OpeningStock has its DbSet).
//===============================================================

public class OpeningStockConfiguration
    : IEntityTypeConfiguration<OpeningStock>,
      IEntityTypeConfiguration<OpeningStockLines>
{
    public void Configure(
        EntityTypeBuilder<OpeningStock> builder)
    {
        builder.ToTable("OpeningStock");

        builder.HasKey(x => x.OpeningStockId);

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_OpeningStock_PublicId");

        builder.Property(x => x.OpeningStockId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PageType).IsRequired().HasMaxLength(5);
        builder.Property(x => x.OpeningNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.OpeningDate).IsRequired();
        builder.Property(x => x.BranchId).IsRequired();
        builder.Property(x => x.BranchCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.FinancialYearId).IsRequired();
        builder.Property(x => x.WarehouseId).IsRequired();
        builder.Property(x => x.WarehouseName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.LedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.LedgerName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CostBasis).IsRequired().HasMaxLength(10);
        builder.Property(x => x.JournalNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.TotalQuantity).HasPrecision(18, 2);
        builder.Property(x => x.TotalValue).HasPrecision(18, 2);
        builder.Property(x => x.TotalVat).HasPrecision(18, 2);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }


    public void Configure(
        EntityTypeBuilder<OpeningStockLines> builder)
    {
        builder.ToTable("OpeningStockLines");

        builder.HasKey(x => x.OpeningStockLineId);

        builder.Property(x => x.OpeningStockLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.OpeningStockId).IsRequired();
        builder.Property(x => x.LineNo).IsRequired();
        builder.Property(x => x.ProductId).IsRequired();
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.UnitCost).HasPrecision(18, 4);
        builder.Property(x => x.LineValue).HasPrecision(18, 2);
        builder.Property(x => x.Mrp).HasPrecision(18, 2);
        builder.Property(x => x.MarginPercent).HasPrecision(9, 4);
        builder.Property(x => x.GrossUnitCost).HasPrecision(18, 4);
        builder.Property(x => x.VatRate).HasPrecision(9, 4);
        builder.Property(x => x.VatAmount).HasPrecision(18, 2);
        builder.Property(x => x.RackCode).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ShelfNumber).IsRequired();
        builder.Property(x => x.BinNumber).IsRequired();
        builder.Property(x => x.ShortNotes).IsRequired().HasMaxLength(200);
        builder.Property(x => x.BatchNo).IsRequired().HasMaxLength(40);
    }
}
