//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.GeneralSettings;


//===============================================================
// Locations Configuration
//===============================================================

public class LocationsConfiguration
    : IEntityTypeConfiguration<Locations>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<Locations> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("Locations");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.LocationId);

        builder.Property(x => x.LocationId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Location Code (LOC-0001)
        //===========================================================

        builder.Property(x => x.LocationCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(x => x.LocationCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_Locations_LocationCode");


        //===========================================================
        // Names
        //===========================================================

        builder.Property(x => x.LocationName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.DisplayName)
               .IsRequired()
               .HasMaxLength(150);

        // Unique within the district (live rows; case is checked
        // by the repository)
        builder.HasIndex(x => new { x.District, x.LocationName })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_Locations_District_LocationName");


        //===========================================================
        // Geography
        //===========================================================

        builder.Property(x => x.Division)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.District)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.PostalCode)
               .IsRequired()
               .HasMaxLength(10);


        //===========================================================
        // Remarks
        //===========================================================

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