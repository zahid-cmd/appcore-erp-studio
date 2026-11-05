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
// Mass Storing : header and lines. Applied because MassStoring
// has its DbSet (the first interface below); the lines also get
// their own DbSet (AppDbContext, outside the AUTO blocks).
//===============================================================

public class MassStoringConfiguration
    : IEntityTypeConfiguration<MassStoring>,
      IEntityTypeConfiguration<MassStoringLines>
{
    public void Configure(
        EntityTypeBuilder<MassStoring> builder)
    {
        builder.ToTable("MassStorings");

        builder.HasKey(x => x.MassStoringId);

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_MassStorings_PublicId");

        builder.Property(x => x.MassStoringId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.StoringNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SequenceNo).IsRequired();
        builder.Property(x => x.PageType).IsRequired().HasMaxLength(2);
        builder.Property(x => x.StoringDate).IsRequired();
        builder.Property(x => x.BranchId).IsRequired();
        builder.Property(x => x.WarehouseId).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.LineCount).IsRequired();
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();

        builder.HasIndex(x => x.StoringNo).IsUnique();
    }

    public void Configure(
        EntityTypeBuilder<MassStoringLines> builder)
    {
        builder.ToTable("MassStoringLines");

        builder.HasKey(x => x.MassStoringLineId);

        builder.Property(x => x.MassStoringLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.MassStoringId).IsRequired();
        builder.Property(x => x.LineNo).IsRequired();
        builder.Property(x => x.ProductId).IsRequired();
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.PartNumber).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(20);
        builder.Property(x => x.FromRackId);
        builder.Property(x => x.FromShelfNo);
        builder.Property(x => x.FromBinNo);
        builder.Property(x => x.ToRackId);
        builder.Property(x => x.ToShelfNo);
        builder.Property(x => x.ToBinNo);
        builder.Property(x => x.StockQuantity).HasPrecision(18, 4);
        builder.Property(x => x.Notes).IsRequired().HasMaxLength(200);

        // One line per product per document
        builder.HasIndex(x => new { x.MassStoringId, x.ProductId }).IsUnique();
    }
}
