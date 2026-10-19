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
// Service Policy Schedule Configuration
//
// Child rows of a Service Policy (no page of their own), so the
// DbSet is registered by hand in AppDbContext, outside the AUTO
// markers : ServicePolicyScheduleRows.
//===============================================================

public class ServicePolicyScheduleConfiguration
    : IEntityTypeConfiguration<ServicePolicySchedule>
{
    public void Configure(
        EntityTypeBuilder<ServicePolicySchedule> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ServicePolicySchedules");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ServicePolicyScheduleId);

        builder.Property(x => x.ServicePolicyScheduleId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Parent + Order (one row per position)
        //===========================================================

        builder.Property(x => x.ServicePolicyId)
               .IsRequired();

        builder.Property(x => x.SequenceNo)
               .IsRequired();

        builder.HasIndex(x => new { x.ServicePolicyId, x.SequenceNo })
               .IsUnique()
               .HasDatabaseName("IX_ServicePolicySchedules_Policy_Sequence");


        //===========================================================
        // Service
        //===========================================================

        builder.Property(x => x.ServiceType)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.ServiceTypeNo)
               .IsRequired();

        builder.Property(x => x.ServiceName)
               .IsRequired()
               .HasMaxLength(100);


        //===========================================================
        // Due (days control; km is reference only) + Grace
        //===========================================================

        builder.Property(x => x.IntervalDays)
               .IsRequired();

        builder.Property(x => x.IntervalKm)
               .IsRequired();

        builder.Property(x => x.GraceDays)
               .IsRequired();


        //===========================================================
        // Audit Information
        //===========================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}