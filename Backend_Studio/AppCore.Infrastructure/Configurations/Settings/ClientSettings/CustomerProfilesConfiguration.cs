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
// Customer Profiles Configuration
//===============================================================

public class CustomerProfilesConfiguration
    : IEntityTypeConfiguration<CustomerProfiles>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<CustomerProfiles> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("CustomerProfiles");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.CustomerId);

        builder.Property(x => x.CustomerId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Columns (no database foreign keys : Code Synchronization
        // rebuilds the tables)
        //===========================================================

        builder.Property(x => x.CustomerType)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.CustomerCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.PreviousCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.CustomerName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.DisplayName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.FatherName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.MotherName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.PhotoPath)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.Phone1)
               .IsRequired()
               .HasMaxLength(11);

        builder.Property(x => x.Phone2)
               .IsRequired()
               .HasMaxLength(11);

        builder.Property(x => x.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.NidNo)
               .IsRequired()
               .HasMaxLength(17);

        builder.Property(x => x.DrivingLicenseNo)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.PresentAddress)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.PermanentAddress)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.RegistrationAddress)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.ReceivableLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.ReceivableLedgerName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.DateOfBirth)
               .HasColumnType("date");

        builder.Property(x => x.LocationId);

        builder.Property(x => x.CreditLimit)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.IsActive)
               .IsRequired();


        //===========================================================
        // Indexes (unique among live rows only)
        //===========================================================

        builder.HasIndex(x => x.CustomerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_CustomerProfiles_CustomerCode");

        builder.HasIndex(x => x.Phone1)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_CustomerProfiles_Phone1");

        builder.HasIndex(x => x.ReceivableLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_CustomerProfiles_ReceivableLedgerCode");

        builder.HasIndex(x => x.NidNo)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false AND \"NidNo\" <> ''")
               .HasDatabaseName("IX_CustomerProfiles_NidNo");

        builder.HasIndex(x => x.LocationId)
               .HasDatabaseName("IX_CustomerProfiles_LocationId");


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