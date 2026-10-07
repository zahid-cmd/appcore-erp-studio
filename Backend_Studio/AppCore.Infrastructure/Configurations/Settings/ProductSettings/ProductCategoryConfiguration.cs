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

        builder.HasIndex(x => x.CategoryCode)
               .IsUnique();


        //===========================================================
        // Category Name
        //===========================================================

        builder.Property(x => x.CategoryName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Inventory Group Code
        //===========================================================

        builder.Property(x => x.InventoryGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.InventoryGroupCode)
               .IsUnique();


        //===========================================================
        // WIP Group Code
        //===========================================================

        builder.Property(x => x.WipGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.WipGroupCode)
               .IsUnique();


        //===========================================================
        // COGS Group Code
        //===========================================================

        builder.Property(x => x.CogsGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.CogsGroupCode)
               .IsUnique();


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

        builder.Property(x => x.SubCategoryCreationAllowed)
               .IsRequired()
               .HasDefaultValue(true);


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