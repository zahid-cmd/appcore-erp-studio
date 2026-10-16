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
// Card Charges Configuration
//===============================================================

public class CardChargesConfiguration
    : IEntityTypeConfiguration<CardCharges>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<CardCharges> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("CardCharges");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x => x.CardChargeId);

        builder.Property(x => x.CardChargeId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // POS Account (master)
        //=======================================================

        builder.Property(x => x.POSAccountId)
               .IsRequired();

        builder.HasIndex(x => x.POSAccountId);

        builder.HasOne<POSAccounts>()
               .WithMany()
               .HasForeignKey(x => x.POSAccountId)
               .OnDelete(DeleteBehavior.Restrict);


        //=======================================================
        // Card (Card Setup)
        //=======================================================

        builder.Property(x => x.CardSetupId)
               .IsRequired();

        builder.HasIndex(x => x.CardSetupId);

        builder.HasOne<CardSetup>()
               .WithMany()
               .HasForeignKey(x => x.CardSetupId)
               .OnDelete(DeleteBehavior.Restrict);


        //=======================================================
        // One card per POS Account (active rows only)
        //=======================================================

        builder.HasIndex(x => new { x.POSAccountId, x.CardSetupId })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false");


        //=======================================================
        // Charge %
        //=======================================================

        builder.Property(x => x.ChargePercent)
               .IsRequired()
               .HasColumnType("numeric(5,2)")
               .HasDefaultValue(0m);


        //=======================================================
        // Soft Delete
        //=======================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //=======================================================
        // Audit Information
        //=======================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}