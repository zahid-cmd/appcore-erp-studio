// PAGE-CLONED : Company -> Color Management (cleaned: Company leftovers removed)
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
// ColorManagement Configuration
//===============================================================

public class ColorManagementConfiguration
    : IEntityTypeConfiguration<ColorManagement>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ColorManagement> builder)
    {
        //===========================================================
        // Table (own table — not shared with Companies)
        //===========================================================

        builder.ToTable("ColorManagements");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ColorManagementId);

        builder.Property(x => x.ColorManagementId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Color Code (unique among non-deleted rows)
        //===========================================================

        builder.Property(x => x.ColorCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.ColorCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ColorManagements_ColorCode");


        //===========================================================
        // Color Name (unique among non-deleted rows)
        //===========================================================

        builder.Property(x => x.ColorName)
               .IsRequired()
               .HasMaxLength(200);

        builder.HasIndex(x => x.ColorName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ColorManagements_ColorName");


        //===========================================================
        // Remarks
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Status
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