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
// Membership Cards Configuration
//===============================================================

public class MembershipCardsConfiguration
    : IEntityTypeConfiguration<MembershipCards>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<MembershipCards> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("MembershipCards");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.MembershipCardId);

        builder.Property(x => x.MembershipCardId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Card Information
        //===========================================================

        builder.Property(x => x.CardCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.CardCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipCards_CardCode");

        builder.Property(x => x.CardName)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.CardName)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipCards_CardName");

        builder.Property(x => x.CardRank)
               .IsRequired();

        builder.HasIndex(x => x.CardRank)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipCards_CardRank");


        //===========================================================
        // Fee Ledger (SUB-009-001-001)
        //===========================================================

        builder.Property(x => x.FeeLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.FeeLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipCards_FeeLedgerCode");

        builder.Property(x => x.FeeLedgerName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Discount Ledger (SUB-004-002-002)
        //===========================================================

        builder.Property(x => x.DiscountLedgerCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.DiscountLedgerCode)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipCards_DiscountLedgerCode");

        builder.Property(x => x.DiscountLedgerName)
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