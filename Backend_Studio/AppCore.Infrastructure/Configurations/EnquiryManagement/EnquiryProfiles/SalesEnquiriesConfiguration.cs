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
// Sales Enquiries Configuration
//
// Table made by SalesEnquiries_Tables.sql. No database foreign
// keys (the repository checks every link).
//===============================================================

public class SalesEnquiriesConfiguration
    : IEntityTypeConfiguration<SalesEnquiries>
{
    public void Configure(
        EntityTypeBuilder<SalesEnquiries> builder)
    {
        builder.ToTable("SalesEnquiries");

        builder.HasKey(x => x.SalesEnquiryId);

        builder.Property(x => x.SalesEnquiryId)
               .ValueGeneratedOnAdd();


        // Public Id (uuid v7; SalesEnquiries_PublicId.sql)
        builder.Property(x => x.PublicId)
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_SalesEnquiries_PublicId");


        // Number
        builder.Property(x => x.EnquiryNo).IsRequired().HasMaxLength(30);

        builder.HasIndex(x => x.EnquiryNo)
               .IsUnique()
               .HasDatabaseName("UX_SalesEnquiries_EnquiryNo");

        builder.Property(x => x.EnquiryYear).IsRequired();

        builder.Property(x => x.EnquiryMonth).IsRequired();

        builder.Property(x => x.SequenceNo).IsRequired();


        // Enquiry Information
        builder.Property(x => x.EnquiryDate).IsRequired();

        builder.Property(x => x.BranchId).IsRequired();

        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.SourceId).IsRequired();

        builder.Property(x => x.StatusId).IsRequired();

        builder.Property(x => x.InterestLevelId);

        builder.Property(x => x.ExecutiveUserId).IsRequired();

        builder.Property(x => x.ExecutiveName).IsRequired().HasMaxLength(150);


        // Enquirer
        builder.Property(x => x.EnquiryContactId).IsRequired();

        builder.Property(x => x.EnquirerMobile).IsRequired().HasMaxLength(11);

        builder.Property(x => x.EnquirerName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.EnquiryFor).IsRequired().HasMaxLength(10);

        builder.HasIndex(x => x.EnquirerMobile)
               .HasDatabaseName("IX_SalesEnquiries_EnquirerMobile");


        // Interest
        builder.Property(x => x.ModelId).IsRequired();

        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.SecondModelId);

        builder.Property(x => x.SecondModelName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.Quantity).IsRequired();

        builder.Property(x => x.Budget).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.PaymentMode).IsRequired().HasMaxLength(10);

        builder.Property(x => x.ExchangeBike).IsRequired().HasMaxLength(200);

        builder.Property(x => x.ExpectedPurchaseDate);

        builder.Property(x => x.PreferredColor).IsRequired().HasMaxLength(50);

        builder.Property(x => x.FromWebsite).IsRequired();

        builder.Property(x => x.TestRideDate);

        builder.Property(x => x.TestRideSlot).IsRequired().HasMaxLength(20);


        // Follow-up
        builder.Property(x => x.NextFollowUpDate);

        builder.Property(x => x.FollowUpMethodId);

        builder.Property(x => x.LastFollowUpDate);

        builder.Property(x => x.LastFollowUpNote).IsRequired().HasMaxLength(500);

        builder.Property(x => x.LostReasonId);

        builder.Property(x => x.ClosedDate);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);


        // Maturity
        builder.Property(x => x.IsMatured).IsRequired();

        builder.Property(x => x.MaturedDate);

        builder.Property(x => x.SaleId);

        builder.Property(x => x.SaleNo).IsRequired().HasMaxLength(40);

        builder.Property(x => x.CustomerId);

        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);


        // Soft Delete / Audit
        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}
