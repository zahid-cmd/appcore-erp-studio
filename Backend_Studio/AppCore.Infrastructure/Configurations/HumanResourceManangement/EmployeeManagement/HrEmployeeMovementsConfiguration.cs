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
// Employee Movements : EF configurations (tables made by
// HumanResource_Phase4_Engine.sql; hand-written page, no Code
// Sync). No database defaults for booleans : EF would skip a
// 'false' value on insert.
//===============================================================

public class HrEmployeeMovementsConfiguration
    : IEntityTypeConfiguration<HrEmployeeMovements>,
      IEntityTypeConfiguration<HrEmployeeMovementLines>
{
    public void Configure(EntityTypeBuilder<HrEmployeeMovements> builder)
    {
        builder.ToTable("HrEmployeeMovements");
        builder.HasKey(x => x.MovementId);
        builder.Property(x => x.MovementId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrEmployeeMovements_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrEmployeeMovements_Code");
        builder.Property(x => x.EmployeeId).IsRequired();
        builder.HasIndex(x => new { x.EmployeeId, x.EffectiveDate }).HasDatabaseName("IX_HrEmployeeMovements_Employee");
        builder.Property(x => x.MovementType).IsRequired().HasMaxLength(15);
        builder.Property(x => x.EffectiveDate).IsRequired().HasColumnType("date");
        builder.Property(x => x.OldEmploymentType).IsRequired().HasMaxLength(15);
        builder.Property(x => x.NewEmploymentType).IsRequired().HasMaxLength(15);
        builder.Property(x => x.OldConfirmationDate).HasColumnType("date");
        builder.Property(x => x.OldGrossSalary).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.NewGrossSalary).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.SeparationType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SettlementAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.SettlementNote).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrEmployeeMovementLines> builder)
    {
        builder.ToTable("HrEmployeeMovementLines");
        builder.HasKey(x => x.MovementLineId);
        builder.Property(x => x.MovementLineId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.MovementId).HasDatabaseName("IX_HrEmployeeMovementLines_Movement");
        builder.Property(x => x.OldAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.NewAmount).IsRequired().HasPrecision(18, 2);
    }
}
