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
// Rack Zones Configuration
//
// No database foreign keys (Code Synchronization rebuilds tables
// independently); the repository checks the warehouse.
// Table made by StorageBins_Engine.sql.
//===============================================================

public class RackZonesConfiguration
    : IEntityTypeConfiguration<RackZones>
{
    public void Configure(
        EntityTypeBuilder<RackZones> builder)
    {
        //===========================================================
        // Table / Primary Key
        //===========================================================

        builder.ToTable("RackZones");

        builder.HasKey(x => x.RackZoneId);

        builder.Property(x => x.RackZoneId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Location
        //===========================================================

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.WarehouseId)
               .IsRequired();

        builder.HasIndex(x => x.WarehouseId)
               .HasDatabaseName("IX_RackZones_WarehouseId");


        //===========================================================
        // Zone (code unique per warehouse among live rows; the
        // name check ignores case in the repository)
        //===========================================================

        builder.Property(x => x.ZoneCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(x => new { x.WarehouseId, x.ZoneCode })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_RackZones_WarehouseId_ZoneCode");

        builder.Property(x => x.ZoneName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.Priority)
               .IsRequired();


        //===========================================================
        // Remarks / Status (no database default for IsActive : EF
        // would skip a 'false' value on insert)
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.IsActive)
               .IsRequired();


        //===========================================================
        // Soft Delete / Audit
        //===========================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}
