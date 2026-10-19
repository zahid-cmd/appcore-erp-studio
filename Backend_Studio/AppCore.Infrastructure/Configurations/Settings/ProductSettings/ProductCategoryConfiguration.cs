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
// Product Category Configuration
//===============================================================

public class ProductCategoryConfiguration
    : IEntityTypeConfiguration<ProductCategory>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ProductCategory> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ProductCategories");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ProductCategoryId);

        builder.Property(x => x.ProductCategoryId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Category Code
        //===========================================================

        builder.Property(x => x.CategoryCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.CategoryCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductCategories_CategoryCode");


        //===========================================================
        // Category Name
        //===========================================================

        builder.Property(x => x.CategoryName)
               .IsRequired()
               .HasMaxLength(200);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.CategoryName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductCategories_CategoryName");


        //===========================================================
        // Category Type (Motor Bikes / Spare Parts / Accessories)
        //===========================================================

        builder.Property(x => x.CategoryType)
               .IsRequired()
               .HasMaxLength(50);


        //===========================================================
        // Brand
        //
        // No database foreign key (Code Synchronization rebuilds
        // tables independently); the repository checks the brand,
        // and Brand Management blocks deleting a brand in use.
        // Brand + Category Type is unique through the name.
        //===========================================================

        builder.Property(x => x.BrandManagementId);

        builder.HasIndex(x => x.BrandManagementId)
               .HasDatabaseName("IX_ProductCategories_BrandManagementId");


        //===========================================================
        // Inventory Group Code
        //===========================================================

        builder.Property(x => x.InventoryGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.InventoryGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductCategories_InventoryGroupCode");


        //===========================================================
        // WIP Group Code
        //===========================================================

        builder.Property(x => x.WipGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.WipGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductCategories_WipGroupCode");


        //===========================================================
        // COGS Group Code
        //===========================================================

        builder.Property(x => x.CogsGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.CogsGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductCategories_CogsGroupCode");


        //===========================================================
        // Inventory Group Name
        //===========================================================

        builder.Property(x => x.InventoryGroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // WIP Group Name
        //===========================================================

        builder.Property(x => x.WipGroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // COGS Group Name
        //===========================================================

        builder.Property(x => x.CogsGroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Configuration
        //===========================================================

        // No database default : with HasDefaultValue(true) EF would
        // skip a 'false' value on insert and the row would be saved true.
        builder.Property(x => x.SubCategoryCreationAllowed)
               .IsRequired();


        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Status
        //===========================================================

        // No database default : with HasDefaultValue(true) EF would
        // skip a 'false' value on insert and the row would be saved true.
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