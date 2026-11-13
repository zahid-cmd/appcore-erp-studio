//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.GeneralSettings;


//===============================================================
// Terms & Conditions : EF configurations (tables made by
// TermsConditions_Engine.sql; hand-written page, no Code Sync).
// No database defaults for booleans : EF would skip a 'false'
// value on insert.
//===============================================================

public class TermsConditionsConfiguration
    : IEntityTypeConfiguration<TermsConditionSets>,
      IEntityTypeConfiguration<TermsConditionLines>
{
    public void Configure(EntityTypeBuilder<TermsConditionSets> builder)
    {
        builder.ToTable("TermsConditionSets");
        builder.HasKey(x => x.TermsConditionSetId);
        builder.Property(x => x.TermsConditionSetId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_TermsConditionSets_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_TermsConditionSets_Code");
        builder.Property(x => x.Title).IsRequired().HasMaxLength(150);
        builder.Property(x => x.OperationCode).IsRequired().HasMaxLength(10);
        builder.Property(x => x.IsDefault).IsRequired();
        builder.Property(x => x.Note).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<TermsConditionLines> builder)
    {
        builder.ToTable("TermsConditionLines");
        builder.HasKey(x => x.TermsConditionLineId);
        builder.Property(x => x.TermsConditionLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.TextEn).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.TextBn).IsRequired().HasMaxLength(1000);
        builder.HasIndex(x => new { x.TermsConditionSetId, x.LineNo }).HasDatabaseName("IX_TermsConditionLines_Set");
    }
}
