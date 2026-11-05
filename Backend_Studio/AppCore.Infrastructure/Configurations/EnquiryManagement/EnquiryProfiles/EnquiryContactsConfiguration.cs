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
// Enquiry Contacts Configuration (the enquirer list)
//
// Table made by SalesEnquiries_Tables.sql. Mobile unique among
// live rows (filtered index).
//===============================================================

public class EnquiryContactsConfiguration
    : IEntityTypeConfiguration<EnquiryContacts>
{
    public void Configure(
        EntityTypeBuilder<EnquiryContacts> builder)
    {
        builder.ToTable("EnquiryContacts");

        builder.HasKey(x => x.EnquiryContactId);

        builder.Property(x => x.EnquiryContactId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Mobile).IsRequired().HasMaxLength(11);

        builder.HasIndex(x => x.Mobile)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("UX_EnquiryContacts_Mobile");

        builder.Property(x => x.ContactName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.AltPhone).IsRequired().HasMaxLength(11);

        builder.Property(x => x.LocationId);

        builder.Property(x => x.Address).IsRequired().HasMaxLength(300);

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}
