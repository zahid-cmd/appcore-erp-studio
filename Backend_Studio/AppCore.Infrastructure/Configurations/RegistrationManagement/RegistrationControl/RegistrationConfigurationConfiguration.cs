//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.RegistrationManagement.RegistrationControl;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.RegistrationManagement.RegistrationControl;


//===============================================================
// Registration Configuration : EF configurations of the four
// tables (made by RegistrationConfiguration_Tables.sql; hand-
// written page, no Code Synchronization). No database defaults
// for booleans : EF would skip a 'false' value on insert.
//===============================================================

public class RegistrationTypesConfiguration
    : IEntityTypeConfiguration<RegistrationTypes>
{
    public void Configure(EntityTypeBuilder<RegistrationTypes> builder)
    {
        builder.ToTable("RegistrationTypes");

        builder.HasKey(x => x.RegistrationTypeId);

        builder.Property(x => x.RegistrationTypeId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_RegistrationTypes_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_RegistrationTypes_Code");

        builder.Property(x => x.RegistrationPlan).IsRequired().HasMaxLength(30);

        builder.Property(x => x.ValidityYears).IsRequired();

        builder.Property(x => x.RegistrationMode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.VehiclePower).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);

        builder.Property(x => x.DisplayOrder).IsRequired();

        builder.Property(x => x.IsDefault).IsRequired();

        builder.Property(x => x.IsSystem).IsRequired();

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class RegistrationFeesConfiguration
    : IEntityTypeConfiguration<RegistrationFees>
{
    public void Configure(EntityTypeBuilder<RegistrationFees> builder)
    {
        builder.ToTable("RegistrationFees");

        builder.HasKey(x => x.RegistrationFeeId);

        builder.Property(x => x.RegistrationFeeId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_RegistrationFees_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_RegistrationFees_Code");

        builder.Property(x => x.RegistrationTypeId).IsRequired();

        builder.Property(x => x.EffectiveFrom).IsRequired().HasColumnType("date");

        builder.Property(x => x.MinimumCollection).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.MaximumCollection).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class RegistrationCostsConfiguration
    : IEntityTypeConfiguration<RegistrationCosts>
{
    public void Configure(EntityTypeBuilder<RegistrationCosts> builder)
    {
        builder.ToTable("RegistrationCosts");

        builder.HasKey(x => x.RegistrationCostId);

        builder.Property(x => x.RegistrationCostId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_RegistrationCosts_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_RegistrationCosts_Code");

        builder.Property(x => x.RegistrationTypeId).IsRequired();

        builder.Property(x => x.EffectiveFrom).IsRequired().HasColumnType("date");

        builder.Property(x => x.BrtaFees).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.SubmissionCharges).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.BrtaTips).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.RegistrationCommission).IsRequired().HasPrecision(18, 2);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.IsActive).IsRequired();

        builder.Property(x => x.IsDeleted).IsRequired();

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}


public class RegistrationStageTimingsConfiguration
    : IEntityTypeConfiguration<RegistrationStageTimings>
{
    public void Configure(EntityTypeBuilder<RegistrationStageTimings> builder)
    {
        builder.ToTable("RegistrationStageTimings");

        builder.HasKey(x => x.RegistrationStageTimingId);

        builder.Property(x => x.RegistrationStageTimingId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_RegistrationStageTimings_PublicId");

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);

        builder.Property(x => x.StageKey).IsRequired().HasMaxLength(30);

        builder.HasIndex(x => x.StageKey).IsUnique().HasDatabaseName("UX_RegistrationStageTimings_Key");

        builder.Property(x => x.StageName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.StageOrder).IsRequired();

        builder.Property(x => x.ExpectedDays);

        builder.Property(x => x.ColorCode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.CreatedBy).IsRequired();

        builder.Property(x => x.CreatedDate).IsRequired();
    }
}
