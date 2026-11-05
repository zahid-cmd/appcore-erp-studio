//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Platform.Inventory;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Inventory;


//===============================================================
// Product Price Index (no DbSet; in the model through this
// configuration)
//===============================================================

public class ProductPriceIndexConfiguration
    : IEntityTypeConfiguration<ProductPriceIndex>
{
    public void Configure(
        EntityTypeBuilder<ProductPriceIndex> builder)
    {
        builder.ToTable("ProductPriceIndex");

        builder.HasKey(x => x.ProductPriceIndexId);

        builder.Property(x => x.ProductPriceIndexId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ProductType).IsRequired().HasMaxLength(5);
        builder.Property(x => x.ProductId).IsRequired();
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.Mrp).HasPrecision(18, 2);
        builder.Property(x => x.EffectiveDate).IsRequired();
        builder.Property(x => x.SourceType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SourceNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
