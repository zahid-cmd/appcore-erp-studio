//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// EMI Reimbursement Schemes Configuration
//===============================================================

public class EmiReimbursementSchemesConfiguration
    : IEntityTypeConfiguration<EmiReimbursementSchemes>
{
    public void Configure(
        EntityTypeBuilder<EmiReimbursementSchemes> builder)
    {
        //=======================================================
        // Table / Key
        //=======================================================

        builder.ToTable("EmiReimbursementSchemes");

        builder.HasKey(x => x.EmiReimbursementSchemeId);

        builder.Property(x => x.EmiReimbursementSchemeId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Scheme
        //=======================================================

        builder.Property(x => x.SchemeCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(x => x.SchemeCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_EmiReimbursementSchemes_SchemeCode");

        // Brand by code (no database FK; checked by the repository)
        builder.Property(x => x.BrandCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.BrandCode)
               .HasDatabaseName("IX_EmiReimbursementSchemes_BrandCode");


        //=======================================================
        // Validity & Tenure
        //=======================================================

        builder.Property(x => x.ValidFrom)
               .IsRequired();

        builder.Property(x => x.ValidTo);

        builder.Property(x => x.TenureMonths)
               .IsRequired();


        //=======================================================
        // Reimbursement
        //=======================================================

        builder.Property(x => x.SwapBasis)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.SwapValue)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.SwapCap)
               .HasPrecision(18, 2);

        builder.Property(x => x.EmiBasis)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.EmiValue)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.EmiCap)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalCap)
               .HasPrecision(18, 2);


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