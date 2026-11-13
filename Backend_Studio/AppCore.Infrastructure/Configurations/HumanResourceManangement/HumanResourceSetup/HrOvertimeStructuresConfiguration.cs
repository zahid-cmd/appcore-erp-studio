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
// Overtime Structures : EF configuration (table made by
// HumanResource_OvertimeStructures_Engine.sql; hand-written page,
// no Code Sync). No database defaults for booleans : EF would
// skip a 'false' value on insert.
//===============================================================

public class HrOvertimeStructuresConfiguration
    : IEntityTypeConfiguration<HrOvertimeStructures>
{
    public void Configure(EntityTypeBuilder<HrOvertimeStructures> builder)
    {
        builder.ToTable("HrOvertimeStructures");
        builder.HasKey(x => x.OvertimeStructureId);
        builder.Property(x => x.OvertimeStructureId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrOvertimeStructures_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrOvertimeStructures_Code");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.RateBase).IsRequired().HasMaxLength(10);
        builder.Property(x => x.FixedHourRate).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.MonthDaysMode).IsRequired().HasMaxLength(10);
        builder.Property(x => x.MonthDays).IsRequired();
        builder.Property(x => x.HoursPerDay).IsRequired().HasPrecision(5, 2);
        builder.Property(x => x.PayExtraHours).IsRequired();
        builder.Property(x => x.HourMultiplier).IsRequired().HasPrecision(6, 3);
        builder.Property(x => x.HolidayHourMultiplier).IsRequired().HasPrecision(6, 3);
        builder.Property(x => x.PayExtraDays).IsRequired();
        builder.Property(x => x.DayMultiplier).IsRequired().HasPrecision(6, 3);
        builder.Property(x => x.IsDefault).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
