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

        builder.HasIndex(x => x.SubCategoryCode)
               .IsUnique();


        //===========================================================
        // Sub Category Name
        //===========================================================

        builder.Property(x => x.SubCategoryName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Inventory Sub Group Code
        //===========================================================

        builder.Property(x => x.InventorySubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.InventorySubGroupCode)
               .IsUnique();


        //===========================================================
        // WIP Sub Group Code
        //===========================================================

        builder.Property(x => x.WipSubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.WipSubGroupCode)
               .IsUnique();


        //===========================================================
        // COGS Sub Group Code
        //===========================================================

        builder.Property(x => x.CogsSubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.CogsSubGroupCode)
               .IsUnique();


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