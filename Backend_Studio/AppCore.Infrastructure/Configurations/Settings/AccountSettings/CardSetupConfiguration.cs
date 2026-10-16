// PAGE-CLONED : Bank Setup -> Card Setup
// PAGE-CLONED : Wings -> Card Setup
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
// CardSetup Configuration
//===============================================================

public class CardSetupConfiguration
    : IEntityTypeConfiguration<CardSetup>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<CardSetup> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("CardSetup");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.CardSetupId);

        builder.Property(x => x.CardSetupId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Card Code
        //===========================================================

        builder.Property(x => x.CardCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.CardCode)
               .IsUnique();

        //===========================================================
        // Card Name
        //===========================================================

        builder.Property(x => x.CardName)
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
        // Issuing Bank
        //===========================================================

        builder.Property(x => x.IssuingBank)
               .IsRequired()
               .HasMaxLength(100);

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