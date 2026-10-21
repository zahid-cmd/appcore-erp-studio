//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.MembershipManagement.MembershipSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Policies Configuration
//===============================================================

public class MembershipPoliciesConfiguration
    : IEntityTypeConfiguration<MembershipPolicies>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<MembershipPolicies> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("MembershipPolicies");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.MembershipPolicyId);

        builder.Property(x => x.MembershipPolicyId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Policy Information
        //===========================================================

        builder.Property(x => x.PolicyCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.PolicyCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipPolicies_PolicyCode");

        // One live policy per card (no database foreign key)
        builder.Property(x => x.MembershipCardId)
               .IsRequired();

        builder.HasIndex(x => x.MembershipCardId)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipPolicies_MembershipCardId");

        builder.Property(x => x.ValidityMonths)
               .IsRequired();


        //===========================================================
        // Fees & Discounts
        //===========================================================

        builder.Property(x => x.EnrollmentFee)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.RenewalFee)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.SparePartsDiscountPercent)
               .IsRequired()
               .HasPrecision(5, 2);

        builder.Property(x => x.AccessoriesDiscountPercent)
               .IsRequired()
               .HasPrecision(5, 2);

        builder.Property(x => x.ServiceChargeDiscountPercent)
               .IsRequired()
               .HasPrecision(5, 2);


        //===========================================================
        // Free Services
        //===========================================================

        builder.Property(x => x.FreeServiceCount)
               .IsRequired();

        builder.Property(x => x.ServiceInterval)
               .IsRequired();

        builder.Property(x => x.ServiceIntervalUnit)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.MissedServiceGraceDays)
               .IsRequired();

        builder.Property(x => x.MaxMissedServices)
               .IsRequired();


        //===========================================================
        // Remarks
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.IsActive)
               .IsRequired();


        //===========================================================
        // Soft Delete
        //===========================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //===========================================================
        // Audit Information
        //===========================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}