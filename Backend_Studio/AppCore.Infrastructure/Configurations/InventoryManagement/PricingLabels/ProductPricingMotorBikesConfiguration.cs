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
// Product Pricing - Motor Bikes : card + lines. The lines have no
// DbSet; they enter the model through this configuration (applied
// because the card has its DbSet).
//===============================================================

public class ProductPricingMotorBikesConfiguration
    : IEntityTypeConfiguration<ProductPricingMotorBikes>,
      IEntityTypeConfiguration<ProductPricingMotorBikeLines>
{
    public void Configure(
        EntityTypeBuilder<ProductPricingMotorBikes> builder)
    {
        builder.ToTable("ProductPricingMotorBikes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_ProductPricingMotorBikes_PublicId");

        builder.Property(x => x.CardNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SupplierCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SupplierName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.CardType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.EffectiveFrom).IsRequired();
        builder.Property(x => x.Reference).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.SupersededById);
        builder.Property(x => x.SupersededByNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SupersededFrom);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(
        EntityTypeBuilder<ProductPricingMotorBikeLines> builder)
    {
        builder.ToTable("ProductPricingMotorBikeLines");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedOnAdd();

        builder.Property(x => x.CardId).IsRequired();
        builder.Property(x => x.LineNo).IsRequired();
        builder.Property(x => x.ModelId).IsRequired();
        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.MotorBikeId);
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.Dp).HasPrecision(18, 2);
        builder.Property(x => x.Mrp).HasPrecision(18, 2);
        builder.Property(x => x.VatRate).HasPrecision(9, 4);
        builder.Property(x => x.VatInside).HasPrecision(18, 2);
        builder.Property(x => x.NetSale).HasPrecision(18, 2);
        builder.Property(x => x.Commission).HasPrecision(18, 2);
        builder.Property(x => x.CommissionPercent).HasPrecision(9, 4);
    }
}
