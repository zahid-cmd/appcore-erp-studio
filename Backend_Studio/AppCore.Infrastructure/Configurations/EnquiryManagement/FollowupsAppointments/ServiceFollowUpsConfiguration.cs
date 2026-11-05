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
// Service Follow-ups Configuration (ServiceFollowUps_Tables.sql)
//===============================================================

public class ServiceFollowUpsConfiguration
    : IEntityTypeConfiguration<ServiceFollowUps>
{
    public void Configure(
        EntityTypeBuilder<ServiceFollowUps> builder)
    {
        builder.ToTable("ServiceFollowUps");

        builder.HasKey(x => x.ServiceFollowUpId);

        builder.Property(x => x.ServiceFollowUpId).ValueGeneratedOnAdd();

        builder.Property(x => x.ServiceEnquiryId).IsRequired();

        builder.HasIndex(x => new { x.ServiceEnquiryId, x.FollowUpAt })
               .HasDatabaseName("IX_ServiceFollowUps_Enquiry_At");

        builder.Property(x => x.EnquiryNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.FollowUpAt).IsRequired();

        builder.Property(x => x.FollowUpDate).IsRequired();

        builder.HasIndex(x => x.FollowUpDate)
               .HasDatabaseName("IX_ServiceFollowUps_Date");

        builder.Property(x => x.MethodId);

        builder.Property(x => x.MethodName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.Outcome).IsRequired().HasMaxLength(30);

        builder.Property(x => x.Note).IsRequired().HasMaxLength(500);

        builder.Property(x => x.NextFollowUpDate);

        builder.Property(x => x.StatusFromId);

        builder.Property(x => x.StatusFromName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.StatusToId).IsRequired();

        builder.Property(x => x.StatusToName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.StatusToStage).IsRequired().HasMaxLength(10);

        builder.Property(x => x.PreferredDateFrom);

        builder.Property(x => x.PreferredDateTo);

        builder.Property(x => x.LostReasonId);

        builder.Property(x => x.LostReasonName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.ExecutiveUserId).IsRequired();

        builder.Property(x => x.ExecutiveName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
