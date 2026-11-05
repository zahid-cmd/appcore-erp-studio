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
// Service Enquiries Configuration
//
// Table made by ServiceEnquiries_Tables.sql. No database foreign
// keys (the repository checks every link).
//===============================================================

public class ServiceEnquiriesConfiguration
    : IEntityTypeConfiguration<ServiceEnquiries>
{
    public void Configure(
        EntityTypeBuilder<ServiceEnquiries> builder)
    {
        builder.ToTable("ServiceEnquiries");

        builder.HasKey(x => x.ServiceEnquiryId);

        builder.Property(x => x.ServiceEnquiryId)
               .ValueGeneratedOnAdd();


        // Public Id (uuid v7; ServiceEnquiries_PublicId.sql)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_ServiceEnquiries_PublicId");


        // Number
        builder.Property(x => x.EnquiryNo).IsRequired().HasMaxLength(30);

        builder.HasIndex(x => x.EnquiryNo)
               .IsUnique()
               .HasDatabaseName("UX_ServiceEnquiries_EnquiryNo");

        builder.Property(x => x.EnquiryYear).IsRequired();

        builder.Property(x => x.EnquiryMonth).IsRequired();

        builder.Property(x => x.SequenceNo).IsRequired();


        // Enquiry Information
        builder.Property(x => x.EnquiryDate).IsRequired();

        builder.Property(x => x.BranchId).IsRequired();

        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.EnquiryType).IsRequired().HasMaxLength(10);

        builder.Property(x => x.SourceId).IsRequired();

        builder.Property(x => x.StatusId).IsRequired();

        builder.Property(x => x.ExecutiveUserId).IsRequired();

        builder.Property(x => x.ExecutiveName).IsRequired().HasMaxLength(150);


        // Enquirer
        builder.Property(x => x.EnquiryContactId).IsRequired();

        builder.Property(x => x.EnquirerMobile).IsRequired().HasMaxLength(20);

        builder.Property(x => x.EnquirerName).IsRequired().HasMaxLength(150);


        // Bike
        builder.Property(x => x.ModelId);

        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.BrandManagementId);

        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.RegistrationNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.KmReading);


        // Request
        builder.Property(x => x.Complaint).IsRequired().HasMaxLength(500);

        builder.Property(x => x.PreferredDate);

        builder.Property(x => x.PreferredSlot).IsRequired().HasMaxLength(20);

        builder.Property(x => x.PickupDrop).IsRequired();

        builder.Property(x => x.EstimatedTotal).HasColumnType("numeric(18,2)");


        // Follow-up
        builder.Property(x => x.NextFollowUpDate);

        builder.Property(x => x.FollowUpMethodId);

        builder.Property(x => x.LastFollowUpDate);

        builder.Property(x => x.LastFollowUpNote).IsRequired().HasMaxLength(500);

        builder.Property(x => x.LostReasonId);

        builder.Property(x => x.ClosedDate);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.FromWebsite).IsRequired();

        builder.Property(x => x.ServiceVehicleScheduleId);


        // Converted
        builder.Property(x => x.IsConverted).IsRequired();

        builder.Property(x => x.ConvertedDate);

        builder.Property(x => x.ConvertedDocType).IsRequired().HasMaxLength(20);

        builder.Property(x => x.ConvertedDocId);

        builder.Property(x => x.ConvertedDocNo).IsRequired().HasMaxLength(40);


        // Soft delete / audit
        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}
