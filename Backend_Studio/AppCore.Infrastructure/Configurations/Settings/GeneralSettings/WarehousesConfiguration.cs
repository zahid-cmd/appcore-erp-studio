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
// Warehouses Configuration
//===============================================================

public class WarehousesConfiguration
    : IEntityTypeConfiguration<Warehouses>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<Warehouses> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("Warehouses");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.WarehouseId);

        builder.Property(x => x.WarehouseId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Company
        //===========================================================

        builder.Property(x => x.CompanyId)
               .IsRequired();

        builder.HasIndex(x => x.CompanyId);


        //===========================================================
        // Company Relationship
        //===========================================================

        builder.HasOne<Company>()
               .WithMany()
               .HasForeignKey(x => x.CompanyId)
               .OnDelete(DeleteBehavior.Restrict);


        //===========================================================
        // Wing
        //===========================================================

        builder.Property(x => x.WingId)
               .IsRequired();

        builder.HasIndex(x => x.WingId);


        //===========================================================
        // Wing Relationship
        //===========================================================

        builder.HasOne<Wings>()
               .WithMany()
               .HasForeignKey(x => x.WingId)
               .OnDelete(DeleteBehavior.Restrict);


        //===========================================================
        // Branch
        //===========================================================

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.HasIndex(x => x.BranchId);


        //===========================================================
        // Branch Relationship
        //===========================================================

        builder.HasOne<Branches>()
               .WithMany()
               .HasForeignKey(x => x.BranchId)
               .OnDelete(DeleteBehavior.Restrict);


        //===========================================================
        // Warehouse Code
        //===========================================================

        builder.Property(x => x.WarehouseCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.WarehouseCode)
               .IsUnique();


        //===========================================================
        // Warehouse Name
        //===========================================================

        builder.Property(x => x.WarehouseName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Display Name
        //===========================================================

        builder.Property(x => x.DisplayName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Contact Information
        //===========================================================

        builder.Property(x => x.Mobile)
               .HasMaxLength(30);

        builder.Property(x => x.Email)
               .HasMaxLength(200);

        builder.Property(x => x.Address)
               .HasMaxLength(500);


        //===========================================================
        // Configuration
        //===========================================================

        builder.Property(x => x.IsBranchGenerated)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.IsDefault)
               .IsRequired()
               .HasDefaultValue(false);

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