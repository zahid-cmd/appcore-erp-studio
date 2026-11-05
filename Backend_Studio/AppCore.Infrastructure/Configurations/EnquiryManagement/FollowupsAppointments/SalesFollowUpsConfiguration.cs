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
// Sales Follow-ups Configuration (SalesFollowUps_Tables.sql)
//===============================================================

public class SalesFollowUpsConfiguration
    : IEntityTypeConfiguration<SalesFollowUps>
{
    public void Configure(
        EntityTypeBuilder<SalesFollowUps> builder)
    {
        builder.ToTable("SalesFollowUps");

        builder.HasKey(x => x.SalesFollowUpId);

        builder.Property(x => x.SalesFollowUpId).ValueGeneratedOnAdd();

        builder.Property(x => x.SalesEnquiryId).IsRequired();

        builder.HasIndex(x => new { x.SalesEnquiryId, x.FollowUpAt })
               .HasDatabaseName("IX_SalesFollowUps_Enquiry_At");

        builder.Property(x => x.EnquiryNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.FollowUpAt).IsRequired();

        builder.Property(x => x.FollowUpDate).IsRequired();

        builder.HasIndex(x => x.FollowUpDate)
               .HasDatabaseName("IX_SalesFollowUps_Date");

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

        builder.Property(x => x.InterestFromId);

        builder.Property(x => x.InterestFromName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.InterestToId);

        builder.Property(x => x.InterestToName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.ExpectedPurchaseFrom);

        builder.Property(x => x.ExpectedPurchaseTo);

        builder.Property(x => x.LostReasonId);

        builder.Property(x => x.LostReasonName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.ExecutiveUserId).IsRequired();

        builder.Property(x => x.ExecutiveName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
