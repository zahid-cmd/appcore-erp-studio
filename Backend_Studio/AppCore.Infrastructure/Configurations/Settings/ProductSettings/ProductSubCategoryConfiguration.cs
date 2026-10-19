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
// Product Sub Category Configuration
//===============================================================

public class ProductSubCategoryConfiguration
    : IEntityTypeConfiguration<ProductSubCategory>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ProductSubCategory> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ProductSubCategories");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ProductSubCategoryId);

        builder.Property(x => x.ProductSubCategoryId)
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
        // Sub Category Code
        //===========================================================

        builder.Property(x => x.SubCategoryCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.SubCategoryCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductSubCategories_SubCategoryCode");


        //===========================================================
        // Sub Category Name
        //===========================================================

        builder.Property(x => x.SubCategoryName)
               .IsRequired()
               .HasMaxLength(200);

        // Unique within its category, among non-deleted rows only
        builder.HasIndex(x => new { x.ProductCategoryId, x.SubCategoryName })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductSubCategories_ProductCategoryId_SubCategoryName");


        //===========================================================
        // Inventory Sub Group Code
        //===========================================================

        builder.Property(x => x.InventorySubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.InventorySubGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductSubCategories_InventorySubGroupCode");


        //===========================================================
        // WIP Sub Group Code
        //===========================================================

        builder.Property(x => x.WipSubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.WipSubGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductSubCategories_WipSubGroupCode");


        //===========================================================
        // COGS Sub Group Code
        //===========================================================

        builder.Property(x => x.CogsSubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.CogsSubGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ProductSubCategories_CogsSubGroupCode");


        //===========================================================
        // Inventory Sub Group Name
        //===========================================================

        builder.Property(x => x.InventorySubGroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // WIP Sub Group Name
        //===========================================================

        builder.Property(x => x.WipSubGroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // COGS Sub Group Name
        //===========================================================

        builder.Property(x => x.CogsSubGroupName)
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