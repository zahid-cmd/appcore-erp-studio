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
// Accessory Locations Configuration
//===============================================================

public class AccessoryLocationsConfiguration
    : IEntityTypeConfiguration<AccessoryLocations>
{
    public void Configure(
        EntityTypeBuilder<AccessoryLocations> builder)
    {
        builder.ToTable("AccessoryLocations");

        builder.HasKey(x => x.AccessoryLocationId);

        builder.Property(x => x.AccessoryLocationId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.AccessoryId)
               .IsRequired();

        builder.Property(x => x.WarehouseId)
               .IsRequired();

        builder.Property(x => x.RackManagementId)
               .IsRequired();

        builder.Property(x => x.ShelfNumber)
               .IsRequired();

        // One location per warehouse for each accessory
        builder.HasIndex(x => new { x.AccessoryId, x.WarehouseId })
               .IsUnique()
               .HasDatabaseName("IX_AccessoryLocations_AccessoryId_WarehouseId");

        builder.HasIndex(x => x.RackManagementId)
               .HasDatabaseName("IX_AccessoryLocations_RackManagementId");

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}