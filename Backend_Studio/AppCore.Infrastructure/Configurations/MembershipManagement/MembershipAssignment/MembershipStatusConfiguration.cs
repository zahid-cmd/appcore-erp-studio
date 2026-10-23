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
// Membership Status Configuration (no database foreign keys)
//===============================================================

public class MembershipStatusConfiguration
    : IEntityTypeConfiguration<MembershipStatus>
{
    public void Configure(
        EntityTypeBuilder<MembershipStatus> builder)
    {
        builder.ToTable("MembershipStatus");

        builder.HasKey(x => x.MembershipId);

        builder.Property(x => x.MembershipId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.MembershipNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.MembershipNo)
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false")
               .HasDatabaseName("IX_MembershipStatus_MembershipNo");

        builder.Property(x => x.EntryType)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.PreviousMembershipId);

        builder.Property(x => x.MembershipCardId)
               .IsRequired();

        builder.HasIndex(x => x.MembershipCardId)
               .HasDatabaseName("IX_MembershipStatus_MembershipCardId");

        builder.Property(x => x.MembershipPolicyId)
               .IsRequired();

        builder.Property(x => x.CustomerId)
               .IsRequired();

        builder.HasIndex(x => x.CustomerId)
               .HasDatabaseName("IX_MembershipStatus_CustomerId");

        builder.Property(x => x.CustomerVehicleId);

        builder.Property(x => x.MotorBikeId)
               .IsRequired();

        builder.Property(x => x.ChassisNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ChassisNo)
               .HasDatabaseName("IX_MembershipStatus_ChassisNo");

        builder.Property(x => x.EngineNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.EnrollmentDate)
               .IsRequired();

        builder.Property(x => x.StartDate)
               .IsRequired();

        builder.Property(x => x.ExpiryDate)
               .IsRequired();

        builder.Property(x => x.FeeAmount)
               .IsRequired()
               .HasPrecision(18, 2);

        builder.Property(x => x.FeeCollected)
               .IsRequired();

        builder.Property(x => x.FeeCollectedDate);

        builder.Property(x => x.ValidityMonths)
               .IsRequired();

        builder.Property(x => x.SparePartsDiscountPercent)
               .IsRequired()
               .HasPrecision(5, 2);

        builder.Property(x => x.AccessoriesDiscountPercent)
               .IsRequired()
               .HasPrecision(5, 2);

        builder.Property(x => x.ServiceChargeDiscountPercent)
               .IsRequired()
               .HasPrecision(5, 2);

        builder.Property(x => x.FreeServiceCount)
               .IsRequired();

        builder.Property(x => x.CarriedServiceCount)
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

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.StatusReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.StatusDate);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);

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