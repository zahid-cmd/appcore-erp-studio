//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.ServiceOperations;


//===============================================================
// Service Operations : the list of outside works (table made by
// ServiceOperations_Outside_Works.sql; hand-written, no Code Sync).
// No database defaults for booleans : EF would skip a 'false' value
// on insert.
//===============================================================

public class WorkshopOutsideWorksConfigurations
    : IEntityTypeConfiguration<WorkshopOutsideWorks>
{
    public void Configure(EntityTypeBuilder<WorkshopOutsideWorks> builder)
    {
        builder.ToTable("WorkshopOutsideWorks");
        builder.HasKey(x => x.WorkshopOutsideWorkId);
        builder.Property(x => x.WorkshopOutsideWorkId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Rate).HasPrecision(18, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }
}
