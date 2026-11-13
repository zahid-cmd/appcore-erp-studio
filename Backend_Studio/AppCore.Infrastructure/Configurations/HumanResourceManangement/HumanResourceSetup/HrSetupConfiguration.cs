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
// Human Resource Setup : EF configurations (tables made by
// HumanResource_Phase1_Engine.sql; hand-written pages, no Code
// Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class HrSetupConfiguration
    : IEntityTypeConfiguration<HrShifts>,
      IEntityTypeConfiguration<HrHolidays>,
      IEntityTypeConfiguration<HrLeaveTypes>,
      IEntityTypeConfiguration<HrSalaryHeads>,
      IEntityTypeConfiguration<HrWeeklyHolidays>
{
    // One row (HumanResource_WeeklyHoliday_Engine.sql)
    public void Configure(EntityTypeBuilder<HrWeeklyHolidays> builder)
    {
        builder.ToTable("HrWeeklyHolidays");
        builder.HasKey(x => x.WeeklyHolidayId);
        builder.Property(x => x.WeeklyHolidayId).ValueGeneratedOnAdd();
        builder.Property(x => x.WeeklyOffDays).IsRequired().HasMaxLength(40);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrShifts> builder)
    {
        builder.ToTable("HrShifts");
        builder.HasKey(x => x.ShiftId);
        builder.Property(x => x.ShiftId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrShifts_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrShifts_Code");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.StartTime).IsRequired().HasMaxLength(5);
        builder.Property(x => x.EndTime).IsRequired().HasMaxLength(5);
        builder.Property(x => x.GraceMinutes).IsRequired();
        builder.Property(x => x.BreakMinutes).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrHolidays> builder)
    {
        builder.ToTable("HrHolidays");
        builder.HasKey(x => x.HolidayId);
        builder.Property(x => x.HolidayId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrHolidays_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrHolidays_Code");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.HolidayType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.FromDate).IsRequired().HasColumnType("date");
        builder.Property(x => x.ToDate).IsRequired().HasColumnType("date");
        builder.HasIndex(x => new { x.FromDate, x.ToDate }).HasDatabaseName("IX_HrHolidays_Dates");
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrLeaveTypes> builder)
    {
        builder.ToTable("HrLeaveTypes");
        builder.HasKey(x => x.LeaveTypeId);
        builder.Property(x => x.LeaveTypeId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrLeaveTypes_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrLeaveTypes_Code");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ShortName).IsRequired().HasMaxLength(10);
        builder.Property(x => x.DaysPerYear).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.IsPaid).IsRequired();
        builder.Property(x => x.CarryForward).IsRequired();
        builder.Property(x => x.MaxCarryDays).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.AppliesTo).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrSalaryHeads> builder)
    {
        builder.ToTable("HrSalaryHeads");
        builder.HasKey(x => x.SalaryHeadId);
        builder.Property(x => x.SalaryHeadId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrSalaryHeads_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrSalaryHeads_Code");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.HeadType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.CalcType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.DefaultValue).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.SystemKey).IsRequired().HasMaxLength(20);
        builder.Property(x => x.IsProrated).IsRequired();
        builder.Property(x => x.DisplayOrder).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
