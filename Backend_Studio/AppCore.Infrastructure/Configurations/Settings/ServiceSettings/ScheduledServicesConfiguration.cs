//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Scheduled Service Configuration
//===============================================================

public class ScheduledServicesConfiguration
    : IEntityTypeConfiguration<ScheduledServices>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ScheduledServices> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ScheduledServices");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ScheduledServiceId);

        builder.Property(x => x.ScheduledServiceId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Service Policy position (no database foreign keys : Code
        // Synchronization rebuilds the tables)
        //===========================================================

        builder.Property(x => x.ServicePolicyId)
               .IsRequired();

        builder.Property(x => x.BrandManagementId)
               .IsRequired();

        builder.Property(x => x.SequenceNo)
               .IsRequired();

        // One row per policy position (live rows)
        builder.HasIndex(x => new { x.ServicePolicyId, x.SequenceNo })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ScheduledServices_Policy_Sequence");

        builder.Property(x => x.ServiceType)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.ServiceTypeNo)
               .IsRequired();

        builder.Property(x => x.PositionName)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.ServiceName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.IntervalDays)
               .IsRequired();

        builder.Property(x => x.IntervalKm)
               .IsRequired();

        builder.Property(x => x.GraceDays)
               .IsRequired();

        // No database defaults : EF would skip a 'false' on insert
        builder.Property(x => x.InPolicy)
               .IsRequired();


        //===========================================================
        // Configuration
        //===========================================================

        builder.Property(x => x.IsConfigured)
               .IsRequired();

        builder.Property(x => x.ServiceSubCategoryId);

        builder.Property(x => x.ServiceCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ServiceCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false AND \"ServiceCode\" <> ''")
               .HasDatabaseName("IX_ScheduledServices_ServiceCode");

        builder.Property(x => x.CustomerCharge)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.BrandReimbursement)
               .IsRequired()
               .HasPrecision(18, 2);


        //===========================================================
        // Income Ledger
        //===========================================================

        builder.Property(x => x.IncomeLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.IncomeLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false AND \"IncomeLedgerCode\" <> ''")
               .HasDatabaseName("IX_ScheduledServices_IncomeLedgerCode");

        builder.Property(x => x.IncomeLedgerName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.IsActive)
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