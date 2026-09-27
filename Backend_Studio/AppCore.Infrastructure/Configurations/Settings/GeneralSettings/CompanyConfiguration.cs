//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.GeneralSettings;


//===============================================================
// Company Configuration
//===============================================================

public class CompanyConfiguration
    : IEntityTypeConfiguration<Company>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<Company> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("Companies");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.CompanyId);

        builder.Property(x => x.CompanyId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Company Code
        //===========================================================

        builder.Property(x => x.CompanyCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.CompanyCode)
               .IsUnique();


        //===========================================================
        // Company Name
        //===========================================================

        builder.Property(x => x.CompanyName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Company Short Name
        //===========================================================

        builder.Property(x => x.CompanyShortName)
               .IsRequired()
               .HasMaxLength(100);


        //===========================================================
        // Address & Contact Information
        //===========================================================

        builder.Property(x => x.AddressLine1)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.AddressLine2)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Phone)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.Mobile)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.Email)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Website)
               .IsRequired()
               .HasMaxLength(250);


        //===========================================================
        // Business Information
        //===========================================================

        builder.Property(x => x.BINNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.OwnershipType)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.EconomicActivity)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.TINNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.TradeLicenseNo)
               .IsRequired()
               .HasMaxLength(50);


        //===========================================================
        // Configuration
        //===========================================================

        builder.Property(x => x.CompanyLogoPath)
               .IsRequired()
               .HasMaxLength(500);

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