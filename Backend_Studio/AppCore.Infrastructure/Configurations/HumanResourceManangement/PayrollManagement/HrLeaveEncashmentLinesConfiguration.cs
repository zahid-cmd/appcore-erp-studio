//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.PayrollManagement;


//===============================================================
// Leave Encashment Lines : EF configuration (table made by
// HumanResource_EncashmentLines_Engine.sql; hand-written page, no
// Code Sync)
//===============================================================

public class HrLeaveEncashmentLinesConfiguration
    : IEntityTypeConfiguration<HrLeaveEncashmentLines>
{
    public void Configure(EntityTypeBuilder<HrLeaveEncashmentLines> builder)
    {
        builder.ToTable("HrLeaveEncashmentLines");
        builder.HasKey(x => x.LeaveEncashmentLineId);
        builder.Property(x => x.LeaveEncashmentLineId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.LeaveEncashmentId).HasDatabaseName("IX_HrLeaveEncashmentLines_Encashment");
        builder.Property(x => x.LeaveTypeName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Entitled).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.Used).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.Days).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
    }
}
