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
// Service Sub Category Configuration
//===============================================================

public class ServiceSubCategoryConfiguration
    : IEntityTypeConfiguration<ServiceSubCategory>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ServiceSubCategory> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ServiceSubCategories");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ServiceSubCategoryId);

        builder.Property(x => x.ServiceSubCategoryId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Sub Category Code (<Category Code>-sss)
        //===========================================================

        builder.Property(x => x.SubCategoryCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.SubCategoryCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServiceSubCategories_SubCategoryCode");


        //===========================================================
        // Service Category (no database foreign key : Code
        // Synchronization rebuilds the tables; the repository
        // checks the link)
        //===========================================================

        builder.Property(x => x.ServiceCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ServiceCategoryId)
               .HasDatabaseName("IX_ServiceSubCategories_ServiceCategoryId");


        //===========================================================
        // Sub Category Type / Name
        //===========================================================

        builder.Property(x => x.SubCategoryType)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.SubCategoryName)
               .IsRequired()
               .HasMaxLength(200);

        builder.HasIndex(x => x.SubCategoryName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServiceSubCategories_SubCategoryName");


        //===========================================================
        // Income Sub Group
        //===========================================================

        builder.Property(x => x.IncomeSubGroupCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.IncomeSubGroupCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServiceSubCategories_IncomeSubGroupCode");

        builder.Property(x => x.IncomeSubGroupName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Configuration
        //===========================================================

        // No database default : with HasDefaultValue(true) EF would
        // skip a 'false' value on insert and the row would be saved true.
        builder.Property(x => x.ItemCreationAllowed)
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