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
// Membership Service Windows Configuration (manual file)
//===============================================================

public class MembershipServiceWindowsConfiguration
    : IEntityTypeConfiguration<MembershipServiceWindows>
{
    public void Configure(
        EntityTypeBuilder<MembershipServiceWindows> builder)
    {
        builder.ToTable("MembershipServiceWindows");

        builder.HasKey(x => x.MembershipServiceWindowId);

        builder.Property(x => x.MembershipServiceWindowId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.MembershipId)
               .IsRequired();

        builder.HasIndex(x => x.MembershipId)
               .HasDatabaseName("IX_MembershipServiceWindows_MembershipId");

        builder.Property(x => x.WindowNo)
               .IsRequired();

        builder.Property(x => x.FromDate)
               .IsRequired();

        builder.Property(x => x.ToDate)
               .IsRequired();

        builder.Property(x => x.IsCarriedOver)
               .IsRequired();

        builder.Property(x => x.UsedDate);

        builder.Property(x => x.UsedReference)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.UsedBy);

        builder.Property(x => x.IsApproved)
               .IsRequired();

        builder.Property(x => x.ApprovedDate);

        builder.Property(x => x.ApprovedBy);

        builder.Property(x => x.ApprovalReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);

    }
}