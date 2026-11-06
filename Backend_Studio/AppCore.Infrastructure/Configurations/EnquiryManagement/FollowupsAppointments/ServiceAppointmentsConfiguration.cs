//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Service Appointments Configuration
// (ServiceAppointments_Tables.sql)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for the Service
// Appointments submenu.
//===============================================================

public class ServiceAppointmentsConfiguration
    : IEntityTypeConfiguration<ServiceAppointments>
{
    public void Configure(
        EntityTypeBuilder<ServiceAppointments> builder)
    {
        builder.ToTable("ServiceAppointments");

        builder.HasKey(x => x.ServiceAppointmentId);

        builder.Property(x => x.ServiceAppointmentId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_ServiceAppointments_PublicId");

        builder.Property(x => x.ServiceEnquiryId).IsRequired();

        builder.HasIndex(x => x.ServiceEnquiryId)
               .HasDatabaseName("IX_ServiceAppointments_Enquiry");

        builder.Property(x => x.EnquiryNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.BranchId).IsRequired();

        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.AppointmentDate).IsRequired();

        builder.HasIndex(x => new { x.BranchId, x.AppointmentDate })
               .HasDatabaseName("IX_ServiceAppointments_Branch_Date");

        builder.Property(x => x.SlotStart).IsRequired().HasColumnType("time");

        builder.Property(x => x.SlotEnd).IsRequired().HasColumnType("time");

        builder.Property(x => x.TimeSlotId);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);

        builder.Property(x => x.StatusDate);

        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(300);

        builder.Property(x => x.AdvisorUserId).IsRequired();

        builder.Property(x => x.AdvisorName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.Note).IsRequired().HasMaxLength(500);

        builder.Property(x => x.RescheduleCount).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}
