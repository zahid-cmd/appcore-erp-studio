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
// Sales Test Rides Configuration (SalesTestRides_Tables.sql)
//===============================================================

public class SalesTestRidesConfiguration
    : IEntityTypeConfiguration<SalesTestRides>
{
    public void Configure(
        EntityTypeBuilder<SalesTestRides> builder)
    {
        builder.ToTable("SalesTestRides");

        builder.HasKey(x => x.SalesTestRideId);

        builder.Property(x => x.SalesTestRideId).ValueGeneratedOnAdd();

        builder.Property(x => x.SalesEnquiryId).IsRequired();

        builder.HasIndex(x => x.SalesEnquiryId)
               .HasDatabaseName("IX_SalesTestRides_Enquiry");

        builder.Property(x => x.EnquiryNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.BranchId).IsRequired();

        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.RideDate).IsRequired();

        builder.HasIndex(x => new { x.BranchId, x.RideDate })
               .HasDatabaseName("IX_SalesTestRides_Branch_Date");

        builder.Property(x => x.SlotStart).IsRequired().HasColumnType("time");

        builder.Property(x => x.SlotEnd).IsRequired().HasColumnType("time");

        builder.Property(x => x.TimeSlotId);

        builder.Property(x => x.ModelId);

        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(200);

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
