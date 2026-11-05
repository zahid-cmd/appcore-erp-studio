//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Accessory Fitments Configuration
//===============================================================

public class AccessoryFitmentsConfiguration
    : IEntityTypeConfiguration<AccessoryFitments>
{
    public void Configure(
        EntityTypeBuilder<AccessoryFitments> builder)
    {
        builder.ToTable("AccessoryFitments");

        builder.HasKey(x => x.AccessoryFitmentId);

        builder.Property(x => x.AccessoryFitmentId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.AccessoryId)
               .IsRequired();

        builder.Property(x => x.ProductSubCategoryId)
               .IsRequired();

        // One link per item and sub category
        builder.HasIndex(x => new { x.AccessoryId, x.ProductSubCategoryId })
               .IsUnique()
               .HasDatabaseName("UX_AccessoryFitments_Accessory_SubCategory");

        builder.HasIndex(x => x.ProductSubCategoryId)
               .HasDatabaseName("IX_AccessoryFitments_SubCategory");

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}
