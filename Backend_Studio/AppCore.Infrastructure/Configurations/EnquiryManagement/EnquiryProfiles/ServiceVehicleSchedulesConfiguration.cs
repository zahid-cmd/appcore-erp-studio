//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Vehicle Schedules Configuration (ServiceVehicles_Tables.sql)
//===============================================================

public class ServiceVehicleSchedulesConfiguration
    : IEntityTypeConfiguration<ServiceVehicleSchedules>
{
    public void Configure(
        EntityTypeBuilder<ServiceVehicleSchedules> builder)
    {
        builder.ToTable("ServiceVehicleSchedules");

        builder.HasKey(x => x.ServiceVehicleScheduleId);

        builder.Property(x => x.ServiceVehicleScheduleId).ValueGeneratedOnAdd();

        builder.Property(x => x.ServiceVehicleId).IsRequired();

        builder.Property(x => x.SequenceNo).IsRequired();

        builder.HasIndex(x => new { x.ServiceVehicleId, x.SequenceNo })
               .IsUnique()
               .HasDatabaseName("UX_ServiceVehicleSchedules_Vehicle_Sequence");

        builder.Property(x => x.ServiceType).IsRequired().HasMaxLength(10);

        builder.Property(x => x.ServiceName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.ScheduledServiceId);

        builder.Property(x => x.IntervalDays).IsRequired();

        builder.Property(x => x.IntervalKm).IsRequired();

        builder.Property(x => x.GraceDays).IsRequired();

        builder.Property(x => x.DueDate).IsRequired();

        builder.Property(x => x.DueKm).IsRequired();

        builder.Property(x => x.LastDate).IsRequired();

        builder.Property(x => x.DueDateEdited).IsRequired();

        builder.Property(x => x.Status).IsRequired().HasMaxLength(12);

        builder.HasIndex(x => new { x.Status, x.DueDate })
               .HasDatabaseName("IX_ServiceVehicleSchedules_Status_Due");

        builder.Property(x => x.ServiceEnquiryId);

        builder.Property(x => x.EnquiryNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.TakenDate);

        builder.Property(x => x.TakenKm);

        builder.Property(x => x.TakenDocType).IsRequired().HasMaxLength(30);

        builder.Property(x => x.TakenDocNo).IsRequired().HasMaxLength(40);

        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
