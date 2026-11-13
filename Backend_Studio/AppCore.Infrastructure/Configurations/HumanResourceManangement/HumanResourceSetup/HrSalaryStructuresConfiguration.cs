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
// Salary Structures : EF configurations (tables made by
// HumanResource_SalaryStructures_Engine.sql; hand-written page,
// no Code Sync). No database defaults for booleans : EF would
// skip a 'false' value on insert.
//===============================================================

public class HrSalaryStructuresConfiguration
    : IEntityTypeConfiguration<HrSalaryStructures>,
      IEntityTypeConfiguration<HrSalaryStructureLines>
{
    public void Configure(EntityTypeBuilder<HrSalaryStructures> builder)
    {
        builder.ToTable("HrSalaryStructures");
        builder.HasKey(x => x.SalaryStructureId);
        builder.Property(x => x.SalaryStructureId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrSalaryStructures_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrSalaryStructures_Code");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.EarningPercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.DeductionPercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.IsDefault).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrSalaryStructureLines> builder)
    {
        builder.ToTable("HrSalaryStructureLines");
        builder.HasKey(x => x.SalaryStructureLineId);
        builder.Property(x => x.SalaryStructureLineId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.SalaryStructureId).HasDatabaseName("IX_HrSalaryStructureLines_Structure");
        builder.Property(x => x.Percent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.Basis).IsRequired().HasMaxLength(10);
        builder.Property(x => x.FixedAmount).IsRequired().HasPrecision(18, 2);
    }
}
