//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.WarrantyManagement.WarrantyControl;


//===============================================================
// Warranty Configuration : EF configurations of the three
// tables (made by WarrantyConfiguration_Tables.sql; hand-written
// page, no Code Synchronization). The DbSets are in AppDbContext
// (a configuration is applied only for a type with a DbSet).
// No database defaults for booleans : EF would skip a 'false'
// value on insert.
//===============================================================

public class WarrantyPartsConfiguration
    : IEntityTypeConfiguration<WarrantyParts>
{
    public void Configure(EntityTypeBuilder<WarrantyParts> builder)
    {
        builder.ToTable("WarrantyParts");

        builder.HasKey(x => x.WarrantyPartId);

        builder.Property(x => x.WarrantyPartId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_WarrantyParts_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_WarrantyParts_Code");

        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);

        builder.Property(x => x.DisplayOrder).IsRequired();

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class WarrantyPoliciesConfiguration
    : IEntityTypeConfiguration<WarrantyPolicies>
{
    public void Configure(EntityTypeBuilder<WarrantyPolicies> builder)
    {
        builder.ToTable("WarrantyPolicies");

        builder.HasKey(x => x.WarrantyPolicyId);

        builder.Property(x => x.WarrantyPolicyId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_WarrantyPolicies_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_WarrantyPolicies_Code");

        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);

        builder.Property(x => x.BrandManagementId).IsRequired();

        builder.Property(x => x.EffectiveFrom).IsRequired().HasColumnType("date");

        builder.Property(x => x.EffectiveTo).HasColumnType("date");

        builder.Property(x => x.PeriodValue).IsRequired();

        builder.Property(x => x.PeriodUnit).IsRequired().HasMaxLength(10);

        builder.Property(x => x.Terms).IsRequired();

        builder.Property(x => x.Exclusions).IsRequired();

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class WarrantyCoveragesConfiguration
    : IEntityTypeConfiguration<WarrantyCoverages>
{
    public void Configure(EntityTypeBuilder<WarrantyCoverages> builder)
    {
        builder.ToTable("WarrantyCoverages");

        builder.HasKey(x => x.WarrantyCoverageId);

        builder.Property(x => x.WarrantyCoverageId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_WarrantyCoverages_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_WarrantyCoverages_Code");

        builder.Property(x => x.WarrantyPolicyId).IsRequired();

        builder.Property(x => x.WarrantyPartId).IsRequired();

        builder.Property(x => x.PeriodValue).IsRequired();

        builder.Property(x => x.PeriodUnit).IsRequired().HasMaxLength(10);

        builder.Property(x => x.Notes).IsRequired().HasMaxLength(200);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
