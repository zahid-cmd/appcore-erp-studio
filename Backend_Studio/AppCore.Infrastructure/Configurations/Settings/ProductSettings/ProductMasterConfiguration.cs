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
// Product Master Configuration
//===============================================================

public class ProductMasterConfiguration
    : IEntityTypeConfiguration<ProductMaster>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ProductMaster> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ProductMasters");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ProductMasterId);

        builder.Property(x => x.ProductMasterId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Product Category
        //===========================================================

        builder.Property(x => x.ProductCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ProductCategoryId);

        builder.HasOne<ProductCategory>()
               .WithMany()
               .HasForeignKey(x => x.ProductCategoryId)
               .OnDelete(DeleteBehavior.Restrict);


        //===========================================================
        // Product Sub Category
        //===========================================================

        builder.Property(x => x.ProductSubCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ProductSubCategoryId);

        builder.HasOne<ProductSubCategory>()
               .WithMany()
               .HasForeignKey(x => x.ProductSubCategoryId)
               .OnDelete(DeleteBehavior.Restrict);


        //===========================================================
        // Sub Category Code
        //===========================================================

        builder.Property(x => x.SubCategoryCode)
               .IsRequired()
               .HasMaxLength(50);


        //===========================================================
        // Product Code
        //===========================================================

        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ProductCode)
               .IsUnique();


        //===========================================================
        // Product Name
        //===========================================================

        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Inventory Ledger Code
        //===========================================================

        builder.Property(x => x.InventoryLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.InventoryLedgerCode)
               .IsUnique();


        //===========================================================
        // WIP Ledger Code
        //===========================================================

        builder.Property(x => x.WipLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.WipLedgerCode)
               .IsUnique();


        //===========================================================
        // COGS Ledger Code
        //===========================================================

        builder.Property(x => x.CogsLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.CogsLedgerCode)
               .IsUnique();


        //===========================================================
        // Inventory Ledger Name
        //===========================================================

        builder.Property(x => x.InventoryLedgerName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // WIP Ledger Name
        //===========================================================

        builder.Property(x => x.WipLedgerName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // COGS Ledger Name
        //===========================================================

        builder.Property(x => x.CogsLedgerName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Configuration
        //===========================================================

        // TODO: Add Product Master specific configuration here

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.IsActive)
               .IsRequired()
               .HasDefaultValue(true);


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