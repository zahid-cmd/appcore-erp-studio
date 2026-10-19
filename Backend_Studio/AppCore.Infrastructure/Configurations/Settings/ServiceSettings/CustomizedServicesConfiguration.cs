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
// Customized Services Configuration
//===============================================================

public class CustomizedServicesConfiguration
    : IEntityTypeConfiguration<CustomizedServices>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<CustomizedServices> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("CustomizedServices");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.CustomizedServiceId);

        builder.Property(x => x.CustomizedServiceId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Service Code (OCS-ccc-sss-nnnnn)
        //===========================================================

        builder.Property(x => x.ServiceCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ServiceCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_CustomizedServices_ServiceCode");


        //===========================================================
        // Sub Category (no database foreign keys : Code
        // Synchronization rebuilds the tables)
        //===========================================================

        builder.Property(x => x.ServiceSubCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ServiceSubCategoryId)
               .HasDatabaseName("IX_CustomizedServices_ServiceSubCategoryId");

        builder.Property(x => x.StandardMinutes)
               .IsRequired();

        builder.Property(x => x.ServiceCharge)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.ServiceName)
               .IsRequired()
               .HasMaxLength(200);

        builder.HasIndex(x => x.ServiceName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_CustomizedServices_ServiceName");


        //===========================================================
        // Income Ledger
        //===========================================================

        builder.Property(x => x.IncomeLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.IncomeLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_CustomizedServices_IncomeLedgerCode");

        builder.Property(x => x.IncomeLedgerName)
               .IsRequired()
               .HasMaxLength(200);


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