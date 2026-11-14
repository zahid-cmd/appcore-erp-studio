//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Leave Encashment Policies : EF configuration (tables made by
// HumanResource_EncashmentPolicies_Engine.sql; hand-written page,
// no Code Sync). No database defaults for booleans : EF would
// skip a 'false' value on insert.
//===============================================================

public class HrLeaveEncashPoliciesConfiguration
    : IEntityTypeConfiguration<HrLeaveEncashPolicies>,
      IEntityTypeConfiguration<HrLeaveEncashPolicyTypes>
{
    public void Configure(EntityTypeBuilder<HrLeaveEncashPolicies> builder)
    {
        builder.ToTable("HrLeaveEncashPolicies");
        builder.HasKey(x => x.LeaveEncashPolicyId);
        builder.Property(x => x.LeaveEncashPolicyId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrLeaveEncashPolicies_PublicId");
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrLeaveEncashPolicies_Code");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.RateBase).IsRequired().HasMaxLength(10);
        builder.Property(x => x.MonthDays).IsRequired();
        builder.Property(x => x.ConfirmedOnly).IsRequired();
        builder.Property(x => x.MinServiceMonths).IsRequired();
        builder.Property(x => x.MaxDaysPerYear).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.KeepDays).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.AfterYearEnd).IsRequired();
        builder.Property(x => x.IsDefault).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrLeaveEncashPolicyTypes> builder)
    {
        builder.ToTable("HrLeaveEncashPolicyTypes");
        builder.HasKey(x => x.LeaveEncashPolicyTypeId);
        builder.Property(x => x.LeaveEncashPolicyTypeId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.LeaveEncashPolicyId).HasDatabaseName("IX_HrLeaveEncashPolicyTypes_Policy");
    }
}
