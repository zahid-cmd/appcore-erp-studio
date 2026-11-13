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
// Payroll : EF configurations (tables made by
// HumanResource_Phase3_Engine.sql; hand-written pages, no Code
// Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class HrPayrollConfiguration
    : IEntityTypeConfiguration<HrSalaryAdvances>,
      IEntityTypeConfiguration<HrSalarySheets>,
      IEntityTypeConfiguration<HrSalarySheetLines>,
      IEntityTypeConfiguration<HrSalarySheetLineHeads>,
      IEntityTypeConfiguration<HrAdvanceRecoveries>
{
    public void Configure(EntityTypeBuilder<HrSalaryAdvances> builder)
    {
        builder.ToTable("HrSalaryAdvances");
        builder.HasKey(x => x.AdvanceId);
        builder.Property(x => x.AdvanceId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrSalaryAdvances_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrSalaryAdvances_Code");
        builder.Property(x => x.EmployeeId).IsRequired();
        builder.HasIndex(x => x.EmployeeId).HasDatabaseName("IX_HrSalaryAdvances_Employee");
        builder.Property(x => x.AdvanceType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.AdvanceDate).IsRequired().HasColumnType("date");
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.InstallmentAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.StartYear).IsRequired();
        builder.Property(x => x.StartMonth).IsRequired();
        builder.Property(x => x.Reason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.VoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.IsClosed).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrSalarySheets> builder)
    {
        builder.ToTable("HrSalarySheets");
        builder.HasKey(x => x.SalarySheetId);
        builder.Property(x => x.SalarySheetId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrSalarySheets_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrSalarySheets_Code");
        builder.Property(x => x.Year).IsRequired();
        builder.Property(x => x.Month).IsRequired();
        builder.Property(x => x.BranchId).IsRequired();
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.LateDaysPerCut).IsRequired();
        builder.Property(x => x.EmployeeCount).IsRequired();
        builder.Property(x => x.TotalGross).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TotalEarned).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TotalDeductions).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.TotalNet).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.JournalVoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrSalarySheetLines> builder)
    {
        builder.ToTable("HrSalarySheetLines");
        builder.HasKey(x => x.SalarySheetLineId);
        builder.Property(x => x.SalarySheetLineId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.SalarySheetId).HasDatabaseName("IX_HrSalarySheetLines_Sheet");
        builder.HasIndex(x => x.EmployeeId).HasDatabaseName("IX_HrSalarySheetLines_Employee");
        builder.Property(x => x.EmployeeCode).IsRequired().HasMaxLength(20);
        builder.Property(x => x.EmployeeName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.DesignationName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.DepartmentName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.PaymentMode).IsRequired().HasMaxLength(10);
        builder.Property(x => x.PaymentAccount).IsRequired().HasMaxLength(150);
        builder.Property(x => x.MonthDays).IsRequired();
        builder.Property(x => x.PayableDays).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.UnpaidDays).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.LateDays).IsRequired();
        builder.Property(x => x.OvertimeHours).IsRequired().HasPrecision(8, 2);
        builder.Property(x => x.OvertimeDays).IsRequired().HasPrecision(6, 2);
        builder.Property(x => x.BasicSalary).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.GrossSalary).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.AbsenceDeduction).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.LateDeduction).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.OvertimeAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PfEmployee).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PfCompany).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PfLoan).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.OtherEarning).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.OtherDeduction).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.EarnedSalary).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.StructureDeduction).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.AdvanceDeduction).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.NetPay).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(200);
        builder.Property(x => x.IsPaid).IsRequired();
        builder.Property(x => x.PaidDate).HasColumnType("date");
        builder.Property(x => x.PaidNote).IsRequired().HasMaxLength(100);
    }

    public void Configure(EntityTypeBuilder<HrSalarySheetLineHeads> builder)
    {
        builder.ToTable("HrSalarySheetLineHeads");
        builder.HasKey(x => x.SalarySheetLineHeadId);
        builder.Property(x => x.SalarySheetLineHeadId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.SalarySheetLineId).HasDatabaseName("IX_HrSalarySheetLineHeads_Line");
        builder.Property(x => x.HeadName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.HeadType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.DisplayOrder).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrAdvanceRecoveries> builder)
    {
        builder.ToTable("HrAdvanceRecoveries");
        builder.HasKey(x => x.AdvanceRecoveryId);
        builder.Property(x => x.AdvanceRecoveryId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.AdvanceId).HasDatabaseName("IX_HrAdvanceRecoveries_Advance");
        builder.HasIndex(x => x.SalarySheetId).HasDatabaseName("IX_HrAdvanceRecoveries_Sheet");
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
    }
}
