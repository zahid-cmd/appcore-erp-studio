// PAGE-CLONED : Wings -> Bank Setup
//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.AccountSettings;


//===============================================================
// BankSetup Configuration
//===============================================================

public class BankSetupConfiguration
    : IEntityTypeConfiguration<BankSetup>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<BankSetup> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("BankSetup");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.BankSetupId);

        builder.Property(x => x.BankSetupId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Bank Code
        //===========================================================

        builder.Property(x => x.BankCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.BankCode)
               .IsUnique();

        //===========================================================
        // Bank Name
        //===========================================================

        builder.Property(x => x.BankName)
               .IsRequired()
               .HasMaxLength(200);

        //===========================================================
        // Remarks
        //===========================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(1000);

        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.Status)
               .IsRequired()
               .HasDefaultValue(false);

        //===========================================================
        // Short Name
        //===========================================================

        builder.Property(x => x.ShortName)
               .HasMaxLength(200);

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