//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// PDI Templates : EF configurations (tables made by
// BikeDeliveries_Pdi_Engine.sql; hand-written page, no Code
// Synchronization; replaces the generated configuration). The
// head keeps the sync's AUTO DbSet; the rest are MANUAL.
// No database defaults for booleans : EF would skip a 'false'
// value on insert.
//===============================================================

public class PdiTemplatesConfiguration
    : IEntityTypeConfiguration<PdiTemplates>,
      IEntityTypeConfiguration<PdiTemplateModels>,
      IEntityTypeConfiguration<PdiTemplateSections>,
      IEntityTypeConfiguration<PdiTemplateItems>
{
    public void Configure(EntityTypeBuilder<PdiTemplates> builder)
    {
        builder.ToTable("PdiTemplates");
        builder.HasKey(x => x.PdiTemplateId);
        builder.Property(x => x.PdiTemplateId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_PdiTemplates_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_PdiTemplates_Code");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.NameBn).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.SheetTitle).IsRequired().HasMaxLength(150);
        builder.Property(x => x.SheetTitleBn).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.FooterNote).IsRequired().HasMaxLength(500);
        builder.Property(x => x.FooterNoteBn).IsRequired().HasMaxLength(3000);
        builder.Property(x => x.ServiceProviderName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
    }

    public void Configure(EntityTypeBuilder<PdiTemplateModels> builder)
    {
        builder.ToTable("PdiTemplateModels");
        builder.HasKey(x => x.PdiTemplateModelId);
        builder.Property(x => x.PdiTemplateModelId).ValueGeneratedOnAdd();
        builder.HasIndex(x => new { x.PdiTemplateId, x.BikeModelId }).IsUnique().HasDatabaseName("UX_PdiTemplateModels_Template_Model");
        builder.HasIndex(x => x.BikeModelId).HasDatabaseName("IX_PdiTemplateModels_Model");
    }

    public void Configure(EntityTypeBuilder<PdiTemplateSections> builder)
    {
        builder.ToTable("PdiTemplateSections");
        builder.HasKey(x => x.PdiTemplateSectionId);
        builder.Property(x => x.PdiTemplateSectionId).ValueGeneratedOnAdd();
        builder.Property(x => x.Title).IsRequired().HasMaxLength(150);
        builder.Property(x => x.TitleBn).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.HasComments).IsRequired();
        builder.HasIndex(x => new { x.PdiTemplateId, x.SortOrder }).HasDatabaseName("IX_PdiTemplateSections_Template");
    }

    public void Configure(EntityTypeBuilder<PdiTemplateItems> builder)
    {
        builder.ToTable("PdiTemplateItems");
        builder.HasKey(x => x.PdiTemplateItemId);
        builder.Property(x => x.PdiTemplateItemId).ValueGeneratedOnAdd();
        builder.Property(x => x.Text).IsRequired().HasMaxLength(200);
        builder.Property(x => x.TextBn).IsRequired().HasMaxLength(2000);
        builder.Property(x => x.ItemType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(20);
        builder.Property(x => x.IsRequired).IsRequired();
        builder.HasIndex(x => new { x.PdiTemplateSectionId, x.SortOrder }).HasDatabaseName("IX_PdiTemplateItems_Section");
    }
}
