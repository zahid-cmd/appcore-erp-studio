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
// Motor Bikes Configuration
//
// No database foreign keys (Code Synchronization rebuilds tables
// independently); the repository checks every parent.
//===============================================================

public class MotorBikesConfiguration
    : IEntityTypeConfiguration<MotorBikes>
{
    public void Configure(
        EntityTypeBuilder<MotorBikes> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("MotorBikes");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.MotorBikeId);

        builder.Property(x => x.MotorBikeId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Parent
        //===========================================================

        builder.Property(x => x.ProductCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ProductCategoryId)
               .HasDatabaseName("IX_MotorBikes_ProductCategoryId");

        builder.Property(x => x.ProductSubCategoryId)
               .IsRequired();

        builder.Property(x => x.ColorManagementId)
               .IsRequired();

        builder.HasIndex(x => x.ColorManagementId)
               .HasDatabaseName("IX_MotorBikes_ColorManagementId");

        // One bike per model and color (non-deleted rows only)
        builder.HasIndex(x => new { x.ProductSubCategoryId, x.ColorManagementId })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MotorBikes_ProductSubCategoryId_ColorManagementId");


        //===========================================================
        // Product Code (unique among non-deleted rows)
        //===========================================================

        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ProductCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MotorBikes_ProductCode");


        //===========================================================
        // Product Name
        //===========================================================

        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(200);


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