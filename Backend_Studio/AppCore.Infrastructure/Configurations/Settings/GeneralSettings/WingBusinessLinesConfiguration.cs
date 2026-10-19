//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.GeneralSettings;


//===============================================================
// Wing Business Lines Configuration
//===============================================================

public class WingBusinessLinesConfiguration
    : IEntityTypeConfiguration<WingBusinessLines>
{
    public void Configure(
        EntityTypeBuilder<WingBusinessLines> builder)
    {
        builder.ToTable("WingBusinessLines");

        builder.HasKey(x => x.WingBusinessLineId);

        builder.Property(x => x.WingBusinessLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.WingId)
               .IsRequired();

        builder.Property(x => x.BusinessLine)
               .IsRequired()
               .HasMaxLength(30);

        // A line once per wing
        builder.HasIndex(x => new { x.WingId, x.BusinessLine })
               .IsUnique()
               .HasDatabaseName("IX_WingBusinessLines_WingId_BusinessLine");

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}