//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Service Policy Configuration
//===============================================================

public class ServicePolicyConfiguration
    : IEntityTypeConfiguration<ServicePolicy>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<ServicePolicy> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("ServicePolicies");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.ServicePolicyId);

        builder.Property(x => x.ServicePolicyId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Policy Code (SVP-nnn)
        //===========================================================

        builder.Property(x => x.PolicyCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.PolicyCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServicePolicies_PolicyCode");


        //===========================================================
        // Brand : one policy per brand
        //
        // No database foreign keys (Code Synchronization rebuilds
        // tables independently); the repository checks them.
        //===========================================================

        builder.Property(x => x.BrandManagementId)
               .IsRequired();

        builder.HasIndex(x => x.BrandManagementId)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServicePolicies_BrandManagementId");



        //===========================================================
        // Warranty Limit for free services
        //===========================================================

        // Years (industry standard)
        builder.Property(x => x.WarrantyYears)
               .IsRequired();

        builder.Property(x => x.WarrantyKm)
               .IsRequired();


        //===========================================================
        // Schedule Summary (counted from the schedule rows)
        //===========================================================

        builder.Property(x => x.FreeServiceCount)
               .IsRequired();

        builder.Property(x => x.PaidServiceCount)
               .IsRequired();


        //===========================================================
        // Associated Ledger (free service claim receivable)
        //===========================================================

        builder.Property(x => x.AssociatedSubGroupId)
               .IsRequired();

        builder.Property(x => x.AssociatedLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        // Unique among non-deleted rows only
        builder.HasIndex(x => x.AssociatedLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_ServicePolicies_AssociatedLedgerCode");

        builder.Property(x => x.AssociatedLedgerName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Configuration
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