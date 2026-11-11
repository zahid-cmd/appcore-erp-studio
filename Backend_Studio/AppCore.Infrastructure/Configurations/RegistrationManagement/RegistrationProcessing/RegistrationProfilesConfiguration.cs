//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.RegistrationManagement.RegistrationProcessing;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.RegistrationManagement.RegistrationProcessing;


//===============================================================
// Registration Profiles : EF configuration (table made by
// RegistrationOnSale_Engine.sql; hand-written page). No database
// defaults for booleans / numbers : EF would skip a 'false' / 0.
//===============================================================

public class RegistrationProfilesConfiguration
    : IEntityTypeConfiguration<RegistrationProfiles>
{
    public void Configure(EntityTypeBuilder<RegistrationProfiles> builder)
    {
        builder.ToTable("RegistrationProfiles");

        builder.HasKey(x => x.RegistrationProfileId);

        builder.Property(x => x.RegistrationProfileId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_RegistrationProfiles_PublicId");

        builder.Property(x => x.ProfileNo).IsRequired().HasMaxLength(60);

        builder.HasIndex(x => x.ProfileNo).IsUnique().HasDatabaseName("UX_RegistrationProfiles_No");

        builder.Property(x => x.ProfileDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.Source).IsRequired().HasMaxLength(20);

        builder.Property(x => x.SalesInvoiceNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.SalesInvoiceDate).HasColumnType("date");

        builder.Property(x => x.CustomerFileNo).IsRequired().HasMaxLength(60);

        builder.Property(x => x.CustomerCode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.CustomerPhone).IsRequired().HasMaxLength(20);

        builder.Property(x => x.SalesmanName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(250);

        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ColorName).IsRequired().HasMaxLength(50);

        builder.Property(x => x.VehiclePower).IsRequired().HasMaxLength(20);

        builder.Property(x => x.RegistrationTypeName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.RegistrationPlan).IsRequired().HasMaxLength(30);

        builder.Property(x => x.RegistrationMode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.Amount).HasPrecision(18, 2);

        builder.Property(x => x.CollectedAmount).HasPrecision(18, 2);

        builder.Property(x => x.BrtaFees).HasPrecision(18, 2);

        builder.Property(x => x.SubmissionCharges).HasPrecision(18, 2);

        builder.Property(x => x.BrtaTips).HasPrecision(18, 2);

        builder.Property(x => x.RegistrationCommission).HasPrecision(18, 2);

        builder.Property(x => x.Surplus).HasPrecision(18, 2);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(30);

        builder.Property(x => x.StatusDate).HasColumnType("date");

        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);

        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);

        builder.HasIndex(x => x.SalesInvoiceId).HasDatabaseName("IX_RegistrationProfiles_Invoice");
    }
}
