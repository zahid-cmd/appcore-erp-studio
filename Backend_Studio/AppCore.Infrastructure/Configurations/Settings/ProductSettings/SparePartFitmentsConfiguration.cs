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
// SparePart Fitments Configuration
//===============================================================

public class SparePartFitmentsConfiguration
    : IEntityTypeConfiguration<SparePartFitments>
{
    public void Configure(
        EntityTypeBuilder<SparePartFitments> builder)
    {
        builder.ToTable("SparePartFitments");

        builder.HasKey(x => x.SparePartFitmentId);

        builder.Property(x => x.SparePartFitmentId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.SparePartId)
               .IsRequired();

        builder.Property(x => x.ProductSubCategoryId)
               .IsRequired();

        // One link per item and sub category
        builder.HasIndex(x => new { x.SparePartId, x.ProductSubCategoryId })
               .IsUnique()
               .HasDatabaseName("UX_SparePartFitments_Part_SubCategory");

        builder.HasIndex(x => x.ProductSubCategoryId)
               .HasDatabaseName("IX_SparePartFitments_SubCategory");

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}
