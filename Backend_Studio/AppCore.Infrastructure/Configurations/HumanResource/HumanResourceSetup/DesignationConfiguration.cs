//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Entities.HumanResource.HumanResourceSetup;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.HumanResource.HumanResourceSetup;

//===============================================================
// Designation Configuration
//===============================================================

public class DesignationConfiguration : IEntityTypeConfiguration<Designation>
{
    public void Configure(EntityTypeBuilder<Designation> builder)
    {
        builder.ToTable("HR_Designation");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);

        builder.HasIndex(x => x.Code).IsUnique();

        builder.HasIndex(x => x.Name).IsUnique();
    }
}