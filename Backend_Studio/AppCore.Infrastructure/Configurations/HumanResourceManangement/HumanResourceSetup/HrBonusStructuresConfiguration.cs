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
// Bonus Structures : EF configuration (tables made by
// HumanResource_BonusStructures_Engine.sql; hand-written page, no
// Code Sync). No database defaults for booleans : EF would skip
// a 'false' value on insert.
//===============================================================

public class HrBonusStructuresConfiguration
    : IEntityTypeConfiguration<HrBonusStructures>,
      IEntityTypeConfiguration<HrBonusStructureSlabs>
{
    public void Configure(EntityTypeBuilder<HrBonusStructures> builder)
    {
        builder.ToTable("HrBonusStructures");
        builder.HasKey(x => x.BonusStructureId);
        builder.Property(x => x.BonusStructureId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_HrBonusStructures_PublicId");
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_HrBonusStructures_Code");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.RateBase).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ServiceFrom).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ConfirmedOnly).IsRequired();
        builder.Property(x => x.IsDefault).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<HrBonusStructureSlabs> builder)
    {
        builder.ToTable("HrBonusStructureSlabs");
        builder.HasKey(x => x.BonusStructureSlabId);
        builder.Property(x => x.BonusStructureSlabId).ValueGeneratedOnAdd();
        builder.HasIndex(x => x.BonusStructureId).HasDatabaseName("IX_HrBonusStructureSlabs_Structure");
        builder.Property(x => x.BonusPercent).IsRequired().HasPrecision(7, 3);
    }
}
