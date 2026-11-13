//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employees : EF configurations (tables made by
// HumanResource_Phase1_Engine.sql; hand-written page, no Code
// Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class HrEmployeesConfiguration
    : IEntityTypeConfiguration<HrEmployees>,
      IEntityTypeConfiguration<HrEmployeeSalaryLines>
{
    public void Configure(EntityTypeBuilder<HrEmployees> builder)
    {
        builder.ToTable("HrEmployees");
        builder.HasKey(x => x.EmployeeId);
        builder.Property(x => x.EmployeeId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrEmployees_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrEmployees_Code");

        builder.Property(x => x.FullName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.FatherName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.MotherName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Gender).IsRequired().HasMaxLength(10);
        builder.Property(x => x.DateOfBirth).HasColumnType("date");
        builder.Property(x => x.BloodGroup).IsRequired().HasMaxLength(5);
        builder.Property(x => x.MaritalStatus).IsRequired().HasMaxLength(15);
        builder.Property(x => x.NationalId).IsRequired().HasMaxLength(30);

        builder.Property(x => x.MobileNo).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Email).IsRequired().HasMaxLength(150);
        builder.Property(x => x.PresentAddress).IsRequired().HasMaxLength(300);
        builder.Property(x => x.PermanentAddress).IsRequired().HasMaxLength(300);
        builder.Property(x => x.EmergencyContactName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.EmergencyContactPhone).IsRequired().HasMaxLength(20);

        builder.Property(x => x.BranchId).IsRequired();
        builder.HasIndex(x => x.BranchId).HasDatabaseName("IX_HrEmployees_Branch");
        builder.Property(x => x.DepartmentId).IsRequired();
        builder.HasIndex(x => x.DepartmentId).HasDatabaseName("IX_HrEmployees_Department");
        builder.Property(x => x.DesignationId).IsRequired();
        builder.Property(x => x.ShiftId).IsRequired();
        builder.Property(x => x.WeeklyOffDays).IsRequired().HasMaxLength(40);
        builder.Property(x => x.EmploymentType).IsRequired().HasMaxLength(15);
        builder.Property(x => x.JoiningDate).IsRequired().HasColumnType("date");
        builder.Property(x => x.ConfirmationDate).HasColumnType("date");

        builder.HasIndex(x => x.SalaryStructureId).HasDatabaseName("IX_HrEmployees_SalaryStructure");
        builder.Property(x => x.GrossSalary).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.OvertimeAllowed).IsRequired();
        builder.HasIndex(x => x.OvertimeStructureId).HasDatabaseName("IX_HrEmployees_OvertimeStructure");
        builder.Property(x => x.OvertimeRate).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PaymentMode).IsRequired().HasMaxLength(10);
        builder.Property(x => x.BankName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.BankAccountNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.MfsName).IsRequired().HasMaxLength(30);
        builder.Property(x => x.MfsNo).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrEmployeeSalaryLines> builder)
    {
        builder.ToTable("HrEmployeeSalaryLines");
        builder.HasKey(x => x.EmployeeSalaryLineId);
        builder.Property(x => x.EmployeeSalaryLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.HasIndex(x => x.EmployeeId).HasDatabaseName("IX_HrEmployeeSalaryLines_Employee");
    }
}
