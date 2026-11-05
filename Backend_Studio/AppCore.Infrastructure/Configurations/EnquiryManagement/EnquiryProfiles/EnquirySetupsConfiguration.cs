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
// Enquiry Setups Configuration
//
// Table made by EnquirySetup_Tables.sql (hand-written page, no
// Code Synchronization). Name uniqueness (per type, ignoring
// case) is checked in the repository.
//===============================================================

public class EnquirySetupsConfiguration
    : IEntityTypeConfiguration<EnquirySetups>
{
    public void Configure(
        EntityTypeBuilder<EnquirySetups> builder)
    {
        //===========================================================
        // Table / Primary Key
        //===========================================================

        builder.ToTable("EnquirySetups");

        builder.HasKey(x => x.EnquirySetupId);

        builder.Property(x => x.EnquirySetupId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // List / Code / Name
        //===========================================================

        builder.Property(x => x.SetupType)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.Code)
               .IsRequired()
               .HasMaxLength(20);

        builder.HasIndex(x => x.Code)
               .IsUnique()
               .HasDatabaseName("UX_EnquirySetups_Code");

        builder.Property(x => x.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(x => new { x.SetupType, x.DisplayOrder })
               .HasDatabaseName("IX_EnquirySetups_Type_Order");


        //===========================================================
        // Colour / Stage / Order / Flags (no database defaults for
        // the booleans : EF would skip a 'false' value on insert)
        //===========================================================

        builder.Property(x => x.ColorCode)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.Stage)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.DaysFrom);

        builder.Property(x => x.DaysTo);

        builder.Property(x => x.TimeFrom)
               .HasColumnType("time");

        builder.Property(x => x.TimeTo)
               .HasColumnType("time");

        builder.Property(x => x.IntervalMinutes);

        builder.Property(x => x.SlotCapacity);

        builder.Property(x => x.BreakFrom)
               .HasColumnType("time");

        builder.Property(x => x.BreakTo)
               .HasColumnType("time");

        builder.Property(x => x.UsedFor)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.DisplayOrder)
               .IsRequired();

        builder.Property(x => x.IsDefault)
               .IsRequired();

        builder.Property(x => x.IsSystem)
               .IsRequired();


        //===========================================================
        // Remarks / Status
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.IsActive)
               .IsRequired();


        //===========================================================
        // Soft Delete / Audit
        //===========================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}
