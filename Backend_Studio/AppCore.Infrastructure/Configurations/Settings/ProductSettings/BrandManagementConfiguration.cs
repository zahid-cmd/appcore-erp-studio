//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.ProductSettings;


//===============================================================
// Brand Management Configuration
//===============================================================

public class BrandManagementConfiguration
    : IEntityTypeConfiguration<BrandManagement>
{
    public void Configure(
        EntityTypeBuilder<BrandManagement> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("BrandManagements");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.BrandManagementId);

        builder.Property(x => x.BrandManagementId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Brand Code (unique among non-deleted rows)
        //===========================================================

        builder.Property(x => x.BrandCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.BrandCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_BrandManagements_BrandCode");


        //===========================================================
        // Brand Name (unique among non-deleted rows)
        //===========================================================

        builder.Property(x => x.BrandName)
               .IsRequired()
               .HasMaxLength(200);

        builder.HasIndex(x => x.BrandName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_BrandManagements_BrandName");


        //===========================================================
        // Brand Image Path ('' when no image)
        //===========================================================

        builder.Property(x => x.BrandImagePath)
               .IsRequired()
               .HasMaxLength(500);


        //===========================================================
        // Remarks (optional : stored as '')
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Motor Bikes Supplier (by supplier code; '' = none)
        //===========================================================

        builder.Property(x => x.MotorBikesSupplierCode)
               .IsRequired()
               .HasMaxLength(20);


        //===========================================================
        // Brand Ledgers (codes + names; '' until created)
        //===========================================================

        builder.Property(x => x.OfferAdjustmentLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.OfferAdjustmentLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.EmiClaimLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.EmiClaimLedgerName)
               .IsRequired()
               .HasMaxLength(250);


        //===========================================================
        // Status (no database default, so 'false' is kept)
        //===========================================================

        builder.Property(x => x.Status)
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