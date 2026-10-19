//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.GeneralSettings;


//===============================================================
// Business Configuration Configuration
//
// No database foreign keys; the repository checks the branch.
//===============================================================

public class BusinessConfigurationConfiguration
    : IEntityTypeConfiguration<BusinessConfiguration>
{
    public void Configure(
        EntityTypeBuilder<BusinessConfiguration> builder)
    {
        builder.ToTable("BusinessConfigurations");

        builder.HasKey(x => x.BusinessConfigurationId);

        builder.Property(x => x.BusinessConfigurationId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Branch
        //===========================================================

        builder.Property(x => x.CompanyId)
               .IsRequired();

        builder.Property(x => x.WingId)
               .IsRequired();

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.HasIndex(x => x.BranchId)
               .HasDatabaseName("IX_BusinessConfigurations_BranchId");


        //===========================================================
        // Grant : one live grant per branch + business line
        //===========================================================

        builder.Property(x => x.BusinessLine)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => new { x.BranchId, x.BusinessLine })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_BusinessConfigurations_BranchId_BusinessLine");

        builder.Property(x => x.AccessType)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.ValidFrom)
               .HasColumnType("date");

        builder.Property(x => x.ValidUntil)
               .HasColumnType("date");


        //===========================================================
        // Remarks / Status
        //
        // No database default on IsActive (EF would skip 'false').
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

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