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
// Rack Management Configuration
//
// No database foreign keys (Code Synchronization rebuilds tables
// independently); the repository checks the warehouse.
//===============================================================

public class RackManagementConfiguration
    : IEntityTypeConfiguration<RackManagement>
{
    public void Configure(
        EntityTypeBuilder<RackManagement> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("RackManagements");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.RackManagementId);

        builder.Property(x => x.RackManagementId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Location
        //===========================================================

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.HasIndex(x => x.BranchId)
               .HasDatabaseName("IX_RackManagements_BranchId");

        builder.Property(x => x.WarehouseId)
               .IsRequired();


        //===========================================================
        // Rack Code / Name (unique within the warehouse,
        // non-deleted rows only)
        //===========================================================

        builder.Property(x => x.RackCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(x => new { x.WarehouseId, x.RackCode })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_RackManagements_WarehouseId_RackCode");

        builder.Property(x => x.RackName)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(x => new { x.WarehouseId, x.RackName })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_RackManagements_WarehouseId_RackName");


        //===========================================================
        // Shelves
        //===========================================================

        builder.Property(x => x.ShelfCount)
               .IsRequired();


        //===========================================================
        // Location Details
        //===========================================================

        builder.Property(x => x.ZoneAisle)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.RackType)
               .IsRequired()
               .HasMaxLength(30);


        //===========================================================
        // Remarks / Status
        //
        // No database default : with HasDefaultValue(true) EF would
        // skip a 'false' value on insert and the row would be saved true.
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.IsActive)
               .IsRequired();


        //===========================================================
        // Soft Delete
        //===========================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //===========================================================
        // Audit Information
        //===========================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}