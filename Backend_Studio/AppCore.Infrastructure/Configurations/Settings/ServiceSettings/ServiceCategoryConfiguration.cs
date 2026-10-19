//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Service Category Configuration
//===============================================================

public class ServiceCategoryConfiguration
    : IEntityTypeConfiguration<ServiceCategory>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ServiceCategory> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ServiceCategories");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ServiceCategoryId);

        builder.Property(x => x.ServiceCategoryId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Category Code (SV-nnn)
        //===========================================================

        builder.Property(x => x.CategoryCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.CategoryCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServiceCategories_CategoryCode");


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
               .HasDatabaseName("IX_ServiceCategories_CategoryName");


        //===========================================================
        // Category Type (Brand Services / Dealer Services)
        //===========================================================

        builder.Property(x => x.CategoryType)
               .IsRequired()
               .HasMaxLength(50);


        //===========================================================
        // Brand
        //
        // No database foreign key (Code Synchronization rebuilds
        // tables independently); the repository checks the brand.
        // One Brand Services category per brand.
        //===========================================================

        builder.Property(x => x.BrandManagementId);

        builder.HasIndex(x => x.BrandManagementId)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false AND \"BrandManagementId\" IS NOT NULL")
               .HasDatabaseName("IX_ServiceCategories_BrandManagementId");


        //===========================================================
        // Income Group Code
        //===========================================================

        builder.Property(x => x.IncomeGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.IncomeGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServiceCategories_IncomeGroupCode");


        //===========================================================
        // Income Group Name
        //===========================================================

        builder.Property(x => x.IncomeGroupName)
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