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

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_RackManagements_PublicId");

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
        // Zone / Assignment / Prime shelves
        //===========================================================

        builder.Property(x => x.RackZoneId);

        builder.HasIndex(x => x.RackZoneId)
               .HasDatabaseName("IX_RackManagements_RackZoneId");

        builder.Property(x => x.ProductCategoryId);

        builder.Property(x => x.PrimeShelfFrom);

        builder.Property(x => x.PrimeShelfTo);


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


//===============================================================
// Rack Shelves Configuration (bins per shelf)
//===============================================================

public class RackShelvesConfiguration
    : IEntityTypeConfiguration<RackShelves>
{
    public void Configure(
        EntityTypeBuilder<RackShelves> builder)
    {
        builder.ToTable("RackShelves");

        builder.HasKey(x => x.RackShelfId);

        builder.Property(x => x.RackShelfId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.RackManagementId)
               .IsRequired();

        builder.Property(x => x.ShelfNumber)
               .IsRequired();

        builder.Property(x => x.BinCount)
               .IsRequired();

        // One row per shelf of a rack
        builder.HasIndex(x => new { x.RackManagementId, x.ShelfNumber })
               .IsUnique()
               .HasDatabaseName("IX_RackShelves_RackManagementId_ShelfNumber");
    }
}


//===============================================================
// Rack Sub Categories Configuration (assignment)
//===============================================================

public class RackSubCategoriesConfiguration
    : IEntityTypeConfiguration<RackSubCategories>
{
    public void Configure(
        EntityTypeBuilder<RackSubCategories> builder)
    {
        builder.ToTable("RackSubCategories");

        builder.HasKey(x => x.RackSubCategoryId);

        builder.Property(x => x.RackSubCategoryId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.RackManagementId)
               .IsRequired();

        builder.Property(x => x.ProductSubCategoryId)
               .IsRequired();

        builder.HasIndex(x => new { x.RackManagementId, x.ProductSubCategoryId })
               .IsUnique()
               .HasDatabaseName("IX_RackSubCategories_RackManagementId_ProductSubCategoryId");
    }
}
