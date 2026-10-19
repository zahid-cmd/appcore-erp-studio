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
// Spare Parts Configuration
//
// No database foreign keys (Code Synchronization rebuilds tables
// independently); the repository checks every parent.
//===============================================================

public class SparePartsConfiguration
    : IEntityTypeConfiguration<SpareParts>
{
    public void Configure(
        EntityTypeBuilder<SpareParts> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("SpareParts");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.SparePartId);

        builder.Property(x => x.SparePartId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Parent
        //===========================================================

        builder.Property(x => x.ProductCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ProductCategoryId)
               .HasDatabaseName("IX_SpareParts_ProductCategoryId");

        builder.Property(x => x.ProductSubCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ProductSubCategoryId)
               .HasDatabaseName("IX_SpareParts_ProductSubCategoryId");


        //===========================================================
        // Part Number
        //
        // Unique within the brand (category), ignoring spaces,
        // hyphens, dots and case : checked on PartNumberKey.
        //===========================================================

        builder.Property(x => x.PartNumber)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.PartNumberKey)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => new { x.ProductCategoryId, x.PartNumberKey })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_SpareParts_ProductCategoryId_PartNumberKey");


        //===========================================================
        // Part Name / Unit
        //===========================================================

        builder.Property(x => x.PartName)
               .IsRequired()
               .HasMaxLength(140);

        builder.Property(x => x.Unit)
               .IsRequired()
               .HasMaxLength(20);


        //===========================================================
        // Product Code (unique among non-deleted rows)
        //===========================================================

        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ProductCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_SpareParts_ProductCode");


        //===========================================================
        // Inventory Ledgers
        //===========================================================

        builder.Property(x => x.InventoryLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.WipLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.CogsLedgerCode)
               .IsRequired()
               .HasMaxLength(50);


        //===========================================================
        // Stock Levels
        //===========================================================

        builder.Property(x => x.ReorderLevel)
               .IsRequired();

        builder.Property(x => x.RedLevel)
               .IsRequired();


        //===========================================================
        // Image / Remarks
        //===========================================================

        builder.Property(x => x.ImagePath)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Status
        //
        // No database default : with HasDefaultValue(true) EF would
        // skip a 'false' value on insert and the row would be saved true.
        //===========================================================

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