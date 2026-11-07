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
// Bike Accessory Schemes Configuration
// (BikeAccessorySchemes_Tables.sql)
//===============================================================

public class BikeAccessorySchemesConfiguration
    : IEntityTypeConfiguration<BikeAccessorySchemes>
{
    public void Configure(
        EntityTypeBuilder<BikeAccessorySchemes> builder)
    {
        builder.ToTable("BikeAccessorySchemes");

        builder.HasKey(x => x.BikeAccessorySchemeId);

        builder.Property(x => x.BikeAccessorySchemeId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_BikeAccessorySchemes_PublicId");

        builder.Property(x => x.SchemeCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.SchemeCode)
               .IsUnique()
               .HasDatabaseName("UX_BikeAccessorySchemes_SchemeCode");

        builder.Property(x => x.SchemeName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.SchemeKind)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.SchemeSource)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.BrandManagementId)
               .IsRequired();

        builder.Property(x => x.ValidFrom)
               .IsRequired();

        builder.Property(x => x.ValidTo)
               .IsRequired(false);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.Status)
               .IsRequired();

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.HasIndex(x => x.BrandManagementId)
               .HasDatabaseName("IX_BikeAccessorySchemes_Brand");
    }
}


public class BikeAccessorySchemeModelsConfiguration
    : IEntityTypeConfiguration<BikeAccessorySchemeModels>
{
    public void Configure(
        EntityTypeBuilder<BikeAccessorySchemeModels> builder)
    {
        builder.ToTable("BikeAccessorySchemeModels");

        builder.HasKey(x => x.BikeAccessorySchemeModelId);

        builder.Property(x => x.BikeAccessorySchemeModelId)
               .ValueGeneratedOnAdd();

        builder.HasIndex(x => new { x.BikeAccessorySchemeId, x.BikeModelId })
               .IsUnique()
               .HasDatabaseName("UX_BikeAccessorySchemeModels_Scheme_Model");

        builder.HasIndex(x => x.BikeModelId)
               .HasDatabaseName("IX_BikeAccessorySchemeModels_Model");
    }
}


public class BikeAccessorySchemeItemsConfiguration
    : IEntityTypeConfiguration<BikeAccessorySchemeItems>
{
    public void Configure(
        EntityTypeBuilder<BikeAccessorySchemeItems> builder)
    {
        builder.ToTable("BikeAccessorySchemeItems");

        builder.HasKey(x => x.BikeAccessorySchemeItemId);

        builder.Property(x => x.BikeAccessorySchemeItemId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.QuantityPerBike)
               .IsRequired();

        builder.HasIndex(x => new { x.BikeAccessorySchemeId, x.AccessoryId })
               .IsUnique()
               .HasDatabaseName("UX_BikeAccessorySchemeItems_Scheme_Accessory");
    }
}
