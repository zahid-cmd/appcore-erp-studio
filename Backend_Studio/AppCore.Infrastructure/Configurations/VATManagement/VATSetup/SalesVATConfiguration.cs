//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.VatManagement.VatSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.VatManagement.VatSetup;


//===============================================================
// Sales VAT Configuration
//===============================================================

public class SalesVatConfiguration
    : IEntityTypeConfiguration<SalesVat>
{
    public void Configure(
        EntityTypeBuilder<SalesVat> builder)
    {
        //=======================================================
        // Table / Key
        //=======================================================

        builder.ToTable("SalesVat");

        builder.HasKey(x => x.SalesVatId);

        builder.Property(x => x.SalesVatId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Rule
        //=======================================================

        builder.Property(x => x.VatCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(x => x.VatCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_SalesVat_VatCode");

        builder.Property(x => x.VatType)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.VatRate)
               .IsRequired()
               .HasPrecision(5, 2);

        builder.Property(x => x.PriceIncludesVat)
               .IsRequired();

        builder.Property(x => x.EffectiveFrom)
               .IsRequired();

        builder.Property(x => x.ValidTo)
               .IsRequired();

        builder.HasIndex(x => new { x.VatType, x.EffectiveFrom })
               .HasDatabaseName("IX_SalesVat_Type_From");


        //=======================================================
        // Ledger (by code; no database FK, checked by the
        // repository)
        //=======================================================

        builder.Property(x => x.LedgerCode)
               .IsRequired()
               .HasMaxLength(40);


        //=======================================================
        // Status & Description
        //=======================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.Status)
               .IsRequired();


        //=======================================================
        // Soft Delete / Audit
        //=======================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}