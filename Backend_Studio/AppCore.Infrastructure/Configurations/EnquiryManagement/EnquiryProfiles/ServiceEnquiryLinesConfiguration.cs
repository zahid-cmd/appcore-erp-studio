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
// Service Enquiry Lines Configuration (ServiceEnquiries_Tables.sql)
//===============================================================

public class ServiceEnquiryLinesConfiguration
    : IEntityTypeConfiguration<ServiceEnquiryLines>
{
    public void Configure(
        EntityTypeBuilder<ServiceEnquiryLines> builder)
    {
        builder.ToTable("ServiceEnquiryLines");

        builder.HasKey(x => x.ServiceEnquiryLineId);

        builder.Property(x => x.ServiceEnquiryLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ServiceEnquiryId).IsRequired();

        builder.HasIndex(x => x.ServiceEnquiryId)
               .HasDatabaseName("IX_ServiceEnquiryLines_Enquiry");

        builder.Property(x => x.LineNo).IsRequired();

        builder.Property(x => x.LineType).IsRequired().HasMaxLength(10);

        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(20);

        builder.Property(x => x.ItemId);

        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.Quantity).HasColumnType("numeric(10,2)");

        builder.Property(x => x.Rate).HasColumnType("numeric(18,2)");

        builder.Property(x => x.Amount).HasColumnType("numeric(18,2)");

        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }
}
