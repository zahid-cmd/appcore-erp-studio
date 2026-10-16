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
// Financial Years Configuration
//===============================================================

public class FinancialYearsConfiguration
    : IEntityTypeConfiguration<FinancialYears>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<FinancialYears> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("FinancialYears");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x => x.FinancialYearId);

        builder.Property(x => x.FinancialYearId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Financial Year Code (unique, deleted rows included so
        // a code is never reused)
        //=======================================================

        builder.Property(x => x.FinancialYearCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(x => x.FinancialYearCode)
               .IsUnique();


        //=======================================================
        // Financial Year Name (unique among active years)
        //=======================================================

        builder.Property(x => x.FinancialYearName)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.FinancialYearName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false");


        //=======================================================
        // Period (PostgreSQL "date")
        //=======================================================

        builder.Property(x => x.StartDate)
               .IsRequired()
               .HasColumnType("date");

        builder.Property(x => x.EndDate)
               .IsRequired()
               .HasColumnType("date");

        builder.HasIndex(x => new { x.StartDate, x.EndDate });


        //=======================================================
        // Current Year (only one active current year)
        //=======================================================

        builder.Property(x => x.IsCurrent)
               .IsRequired()
               .HasDefaultValue(false);

        builder.HasIndex(x => x.IsCurrent)
               .IsUnique()
               .HasFilter("\"IsCurrent\" = true AND \"IsDeleted\" = false")
               .HasDatabaseName("IX_FinancialYears_OneCurrent");


        //=======================================================
        // Year Status
        //=======================================================

        builder.Property(x => x.YearStatus)
               .IsRequired()
               .HasMaxLength(20)
               .HasDefaultValue("Open");


        //=======================================================
        // Remarks
        //=======================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(1000);


        //=======================================================
        // Status
        //=======================================================

        builder.Property(x => x.Status)
               .IsRequired()
               .HasDefaultValue(false);


        //=======================================================
        // Soft Delete
        //=======================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

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