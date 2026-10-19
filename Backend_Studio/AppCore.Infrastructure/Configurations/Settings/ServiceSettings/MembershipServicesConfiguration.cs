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
// Membership Services Configuration
//===============================================================

public class MembershipServicesConfiguration
    : IEntityTypeConfiguration<MembershipServices>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<MembershipServices> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("MembershipServices");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.MembershipServiceId);

        builder.Property(x => x.MembershipServiceId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Service Code (MSC-ccc-sss-nnnnn)
        //===========================================================

        builder.Property(x => x.ServiceCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ServiceCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipServices_ServiceCode");


        //===========================================================
        // Sub Category (no database foreign keys : Code
        // Synchronization rebuilds the tables)
        //===========================================================

        builder.Property(x => x.ServiceSubCategoryId)
               .IsRequired();

        builder.HasIndex(x => x.ServiceSubCategoryId)
               .HasDatabaseName("IX_MembershipServices_ServiceSubCategoryId");

        builder.Property(x => x.MembershipType)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.ServiceValue)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.ServiceName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.DisplayName)
               .IsRequired()
               .HasMaxLength(200);

        // "<Service Name> - <Membership Type>" unique (live rows)
        builder.HasIndex(x => x.DisplayName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipServices_DisplayName");


        //===========================================================
        // Income Ledger (billed; under the sub category's sub group)
        //===========================================================

        builder.Property(x => x.IncomeLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.IncomeLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false AND \"IncomeLedgerCode\" <> ''")
               .HasDatabaseName("IX_MembershipServices_IncomeLedgerCode");

        builder.Property(x => x.IncomeLedgerName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Expense Ledger (under SUB-004-002-001)
        //===========================================================

        builder.Property(x => x.ExpenseLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ExpenseLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipServices_ExpenseLedgerCode");

        builder.Property(x => x.ExpenseLedgerName)
               .IsRequired()
               .HasMaxLength(200);


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