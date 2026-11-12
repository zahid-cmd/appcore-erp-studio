//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.MembershipManagement.MembershipAssignment;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Fees Collection : EF configuration (table
// "MembershipFees", MembershipFees_Engine.sql; hand-written page)
//===============================================================

public class MembershipFeesCollectionConfiguration
    : IEntityTypeConfiguration<MembershipFeesCollection>
{
    public void Configure(EntityTypeBuilder<MembershipFeesCollection> builder)
    {
        builder.ToTable("MembershipFees");

        builder.HasKey(x => x.MembershipFeeId);

        builder.Property(x => x.MembershipFeeId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_MembershipFees_PublicId");

        builder.Property(x => x.FeeNo).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.FeeNo).IsUnique().HasDatabaseName("UX_MembershipFees_No");

        builder.Property(x => x.FeeType).IsRequired().HasMaxLength(20);

        builder.Property(x => x.MembershipNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.CardName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.FeeLedgerCode).IsRequired().HasMaxLength(30);

        builder.Property(x => x.CustomerCode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.Amount).HasPrecision(18, 2);

        builder.Property(x => x.CollectedDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.Narration).IsRequired().HasMaxLength(500);

        builder.Property(x => x.ReceiptVoucherNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);

        builder.Property(x => x.RefundDate).HasColumnType("date");

        builder.Property(x => x.RefundReason).IsRequired().HasMaxLength(500);

        builder.Property(x => x.RefundJournalVoucherNo).IsRequired().HasMaxLength(50);

        builder.HasIndex(x => new { x.MembershipId, x.Status }).HasDatabaseName("IX_MembershipFees_Membership");
    }
}
