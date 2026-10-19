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
// Spare Part Locations Configuration
//===============================================================

public class SparePartLocationsConfiguration
    : IEntityTypeConfiguration<SparePartLocations>
{
    public void Configure(
        EntityTypeBuilder<SparePartLocations> builder)
    {
        builder.ToTable("SparePartLocations");

        builder.HasKey(x => x.SparePartLocationId);

        builder.Property(x => x.SparePartLocationId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.SparePartId)
               .IsRequired();

        builder.Property(x => x.WarehouseId)
               .IsRequired();

        builder.Property(x => x.RackManagementId)
               .IsRequired();

        builder.Property(x => x.ShelfNumber)
               .IsRequired();

        // One location per warehouse for each part
        builder.HasIndex(x => new { x.SparePartId, x.WarehouseId })
               .IsUnique()
               .HasDatabaseName("IX_SparePartLocations_SparePartId_WarehouseId");

        builder.HasIndex(x => x.RackManagementId)
               .HasDatabaseName("IX_SparePartLocations_RackManagementId");

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}