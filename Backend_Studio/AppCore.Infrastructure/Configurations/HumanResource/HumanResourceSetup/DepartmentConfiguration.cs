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
// Department Configuration
//===============================================================

public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("HR_Department");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Code)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.ShortName)
            .HasMaxLength(20);

        builder.Property(x => x.DepartmentHead)
            .HasMaxLength(100);

        builder.Property(x => x.Email)
            .HasMaxLength(100);

        builder.Property(x => x.Phone)
            .HasMaxLength(30);

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);

        builder.HasIndex(x => x.Code).IsUnique();

        builder.HasIndex(x => new { x.CompanyId, x.Name }).IsUnique();
    }
}