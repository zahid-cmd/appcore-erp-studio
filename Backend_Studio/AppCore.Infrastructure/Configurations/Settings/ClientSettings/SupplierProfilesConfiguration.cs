//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.ClientSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ClientSettings;


//===============================================================
// Supplier Profiles Configuration
//===============================================================

public class SupplierProfilesConfiguration
    : IEntityTypeConfiguration<SupplierProfiles>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<SupplierProfiles> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("SupplierProfiles");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.SupplierId);

        builder.Property(x => x.SupplierId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Columns (no database foreign keys : Code Synchronization
        // rebuilds the tables)
        //===========================================================

        builder.Property(x => x.SupplierCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.SupplierType)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.SupplierName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.DisplayName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.ContactPerson)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.Phone1)
               .IsRequired()
               .HasMaxLength(11);

        builder.Property(x => x.Phone2)
               .IsRequired()
               .HasMaxLength(11);

        builder.Property(x => x.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.Address)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.TradeLicenseNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.BinNo)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.TinNo)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.PayableLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.PayableLedgerName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.BrandManagementId);

        builder.Property(x => x.CreditDays)
               .IsRequired();

        builder.Property(x => x.IsActive)
               .IsRequired();


        //===========================================================
        // Indexes (unique among live rows only)
        //===========================================================

        builder.HasIndex(x => x.SupplierCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_SupplierProfiles_SupplierCode");

        builder.HasIndex(x => x.Phone1)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_SupplierProfiles_Phone1");

        builder.HasIndex(x => x.PayableLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_SupplierProfiles_PayableLedgerCode");

        builder.HasIndex(x => x.BinNo)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false AND \"BinNo\" <> ''")
               .HasDatabaseName("IX_SupplierProfiles_BinNo");

        builder.HasIndex(x => x.TinNo)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false AND \"TinNo\" <> ''")
               .HasDatabaseName("IX_SupplierProfiles_TinNo");

        builder.HasIndex(x => x.BrandManagementId)
               .HasDatabaseName("IX_SupplierProfiles_BrandManagementId");


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