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
// Branches Configuration
//===============================================================

public class BranchesConfiguration
    : IEntityTypeConfiguration<Branches>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<Branches> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("Branches");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.BranchId);

        builder.Property(x => x.BranchId)
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
        // Branch Information
        //===========================================================

        builder.Property(x => x.BranchCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.BranchCode)
               .IsUnique();


        builder.Property(x => x.ShortName)
               .IsRequired()
               .HasMaxLength(100);


        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Contact Information
        //===========================================================

        builder.Property(x => x.Mobile)
               .IsRequired()
               .HasMaxLength(30);


        builder.Property(x => x.Email)
               .IsRequired()
               .HasMaxLength(200);


        builder.Property(x => x.Address)
               .IsRequired()
               .HasMaxLength(500);


        //===========================================================
        // Configuration
        //===========================================================

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