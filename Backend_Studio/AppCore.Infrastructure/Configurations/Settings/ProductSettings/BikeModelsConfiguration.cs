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
// Bike Models Configuration (BikeModels_Tables.sql)
//===============================================================

public class BikeModelsConfiguration
    : IEntityTypeConfiguration<BikeModels>
{
    public void Configure(
        EntityTypeBuilder<BikeModels> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("BikeModels");


        //===========================================================
        // Primary Key / Public Id
        //===========================================================

        builder.HasKey(x => x.BikeModelId);

        builder.Property(x => x.BikeModelId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_BikeModels_PublicId");


        //===========================================================
        // Model Code (unique among non-deleted rows)
        //===========================================================

        builder.Property(x => x.ModelCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.ModelCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_BikeModels_ModelCode");


        //===========================================================
        // Brand + Model Name (unique within the brand)
        //===========================================================

        builder.Property(x => x.BrandManagementId)
               .IsRequired();

        builder.Property(x => x.ModelName)
               .IsRequired()
               .HasMaxLength(150);

        builder.HasIndex(x => x.BrandManagementId)
               .HasDatabaseName("IX_BikeModels_Brand");


        //===========================================================
        // Type / Website
        //===========================================================

        builder.Property(x => x.BikeType)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.ShowOnWebsite)
               .IsRequired();

        builder.Property(x => x.IsFeatured)
               .IsRequired();

        builder.Property(x => x.Tagline)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Description)
               .IsRequired()
               .HasMaxLength(2000);

        builder.Property(x => x.DisplayOrder)
               .IsRequired();


        //===========================================================
        // Remarks / Status
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.Status)
               .IsRequired();


        //===========================================================
        // Soft Delete / Audit
        //===========================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}
