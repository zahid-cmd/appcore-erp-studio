//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Attendance and leave : EF configurations (tables made by
// HumanResource_Phase2_Engine.sql; hand-written pages, no Code
// Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class HrAttendanceConfiguration
    : IEntityTypeConfiguration<HrAttendance>,
      IEntityTypeConfiguration<HrLeaveApplications>
{
    public void Configure(EntityTypeBuilder<HrAttendance> builder)
    {
        builder.ToTable("HrAttendance");
        builder.HasKey(x => x.AttendanceId);
        builder.Property(x => x.AttendanceId).ValueGeneratedOnAdd();
        builder.Property(x => x.EmployeeId).IsRequired();
        builder.Property(x => x.AttendanceDate).IsRequired().HasColumnType("date");
        builder.HasIndex(x => new { x.EmployeeId, x.AttendanceDate }).IsUnique().HasDatabaseName("UX_HrAttendance_EmployeeDate");
        builder.HasIndex(x => x.AttendanceDate).HasDatabaseName("IX_HrAttendance_Date");
        builder.HasIndex(x => x.LeaveApplicationId).HasDatabaseName("IX_HrAttendance_Application");
        builder.Property(x => x.Status).IsRequired().HasMaxLength(2);
        builder.Property(x => x.InTime).IsRequired().HasMaxLength(5);
        builder.Property(x => x.OutTime).IsRequired().HasMaxLength(5);
        builder.Property(x => x.LateMinutes).IsRequired();
        builder.Property(x => x.OvertimeHours).IsRequired().HasPrecision(5, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(200);
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrLeaveApplications> builder)
    {
        builder.ToTable("HrLeaveApplications");
        builder.HasKey(x => x.LeaveApplicationId);
        builder.Property(x => x.LeaveApplicationId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrLeaveApplications_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrLeaveApplications_Code");
        builder.Property(x => x.EmployeeId).IsRequired();
        builder.HasIndex(x => new { x.EmployeeId, x.FromDate }).HasDatabaseName("IX_HrLeaveApplications_Employee");
        builder.Property(x => x.LeaveTypeId).IsRequired();
        builder.Property(x => x.FromDate).IsRequired().HasColumnType("date");
        builder.Property(x => x.ToDate).IsRequired().HasColumnType("date");
        builder.Property(x => x.Days).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.Reason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.DecisionNote).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
