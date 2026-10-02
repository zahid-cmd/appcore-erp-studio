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
// Wings Configuration
//===============================================================

public class WingsConfiguration
    : IEntityTypeConfiguration<Wings>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<Wings> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("Wings");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.WingId);

        builder.Property(x => x.WingId)
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
        // Wing Code
        //===========================================================

        builder.Property(x => x.WingCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.WingCode)
               .IsUnique();


        //===========================================================
        // Wing Name
        //===========================================================

        builder.Property(x => x.WingName)
               .IsRequired()
               .HasMaxLength(200);


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