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
// Barcode print history : runs + lines. Both have a DbSet in
// AppDbContext (BarcodePrintRunRows / BarcodePrintRunLineRows),
// so this configuration is applied by the registered-entity
// filter of OnModelCreating.
//===============================================================

public class BarcodePrintRunsConfiguration
    : IEntityTypeConfiguration<BarcodePrintRuns>,
      IEntityTypeConfiguration<BarcodePrintRunLines>
{
    public void Configure(
        EntityTypeBuilder<BarcodePrintRuns> builder)
    {
        builder.ToTable("BarcodePrintRuns");

        builder.HasKey(x => x.BarcodePrintRunId);

        builder.Property(x => x.BarcodePrintRunId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ProductType).IsRequired().HasMaxLength(5);
        builder.Property(x => x.LabelKind).IsRequired().HasMaxLength(20);
        builder.Property(x => x.PaperCode).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SourceType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SourceNo).IsRequired().HasMaxLength(60);
        builder.Property(x => x.PrintedByName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.PrintedBy).IsRequired();
        builder.Property(x => x.PrintedDate).IsRequired();
    }

    public void Configure(
        EntityTypeBuilder<BarcodePrintRunLines> builder)
    {
        builder.ToTable("BarcodePrintRunLines");

        builder.HasKey(x => x.BarcodePrintRunLineId);

        builder.Property(x => x.BarcodePrintRunLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.BarcodePrintRunId).IsRequired();
        builder.Property(x => x.LineNo).IsRequired();
        builder.Property(x => x.BatchNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Mrp).HasPrecision(18, 2);
        builder.Property(x => x.BarcodeValue).IsRequired().HasMaxLength(60);
    }
}
