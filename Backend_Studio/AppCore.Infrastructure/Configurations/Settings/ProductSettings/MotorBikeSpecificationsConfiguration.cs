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
// Motor Bike Specifications Configuration
// (MotorBikeSpecifications_Tables.sql)
//===============================================================

public class MotorBikeSpecificationsConfiguration
    : IEntityTypeConfiguration<MotorBikeSpecifications>
{
    public void Configure(
        EntityTypeBuilder<MotorBikeSpecifications> builder)
    {
        builder.ToTable("MotorBikeSpecifications");

        builder.HasKey(x => x.MotorBikeSpecificationId);

        builder.Property(x => x.MotorBikeSpecificationId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_MotorBikeSpecifications_PublicId");

        builder.Property(x => x.SpecificationCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.SpecificationCode)
               .IsUnique()
               .HasDatabaseName("UX_MotorBikeSpecifications_Code");

        builder.Property(x => x.BikeModelId)
               .IsRequired();

        // One live specification per bike model
        builder.HasIndex(x => x.BikeModelId)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("UX_MotorBikeSpecifications_Model_Live");

        builder.Property(x => x.EngineCc)
               .HasPrecision(8, 2);

        builder.Property(x => x.FuelType)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.VehicleClass)
               .IsRequired()
               .HasMaxLength(60);

        builder.Property(x => x.BodyType)
               .IsRequired()
               .HasMaxLength(60);

        builder.Property(x => x.UnladenWeightKg)
               .HasPrecision(8, 2);

        builder.Property(x => x.LadenWeightKg)
               .HasPrecision(8, 2);

        builder.Property(x => x.Maker)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.CountryOfOrigin)
               .IsRequired()
               .HasMaxLength(80);

        builder.Property(x => x.HorsePower)
               .IsRequired()
               .HasMaxLength(60);

        builder.Property(x => x.Mileage)
               .IsRequired()
               .HasMaxLength(60)
               .HasDefaultValue(string.Empty);

        builder.Property(x => x.TopSpeedKmh)
               .HasDefaultValue(0);

        builder.Property(x => x.FrontTyreSize)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.RearTyreSize)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.ShowOnWebsite)
               .IsRequired();

        builder.Property(x => x.Status)
               .IsRequired();

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}


public class MotorBikeSpecificationItemsConfiguration
    : IEntityTypeConfiguration<MotorBikeSpecificationItems>
{
    public void Configure(
        EntityTypeBuilder<MotorBikeSpecificationItems> builder)
    {
        builder.ToTable("MotorBikeSpecificationItems");

        builder.HasKey(x => x.MotorBikeSpecificationItemId);

        builder.Property(x => x.MotorBikeSpecificationItemId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Section)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.Label)
               .IsRequired()
               .HasMaxLength(80);

        builder.Property(x => x.Value)
               .IsRequired()
               .HasMaxLength(250);

        builder.HasIndex(x => x.MotorBikeSpecificationId)
               .HasDatabaseName("IX_MotorBikeSpecificationItems_Specification");
    }
}
