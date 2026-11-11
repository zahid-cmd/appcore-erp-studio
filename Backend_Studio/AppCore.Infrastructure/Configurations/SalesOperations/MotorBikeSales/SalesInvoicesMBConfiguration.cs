//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;
using AppCore.Infrastructure.Configurations.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.MotorBikeSales;


//===============================================================
// Sales Invoices - MB : header + lines (with the bike) + payment
// rows (replaces the generated configuration). The header is
// registered by Code Synchronization (DbSet); the lines and
// payments enter the model through this class.
// SalesInvoicesMB_Engine.sql
//===============================================================

public class SalesInvoicesMbConfiguration
    : IEntityTypeConfiguration<SalesInvoicesMb>,
      IEntityTypeConfiguration<SalesInvoicesMbLines>,
      IEntityTypeConfiguration<SalesInvoicesMbPayments>
{
    public void Configure(
        EntityTypeBuilder<SalesInvoicesMb> builder)
    {
        SalesInvoiceModel.ConfigureHeader(builder, "SalesInvoicesMb");

        builder.Property(x => x.SaleType).IsRequired().HasMaxLength(10);

        // Registration on the invoice (RegistrationOnSale_Engine.sql)
        builder.Property(x => x.RegistrationTypeName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.RegistrationAmount).HasPrecision(18, 2);

        builder.Property(x => x.RegistrationTotal).HasPrecision(18, 2);

        builder.Property(x => x.RegistrationCommission).HasPrecision(18, 2);

        builder.Property(x => x.RegistrationStatus).IsRequired().HasMaxLength(20);

        builder.Property(x => x.RegistrationReversalNo).IsRequired().HasMaxLength(30);

        builder.Property(x => x.RegistrationReverseReason).IsRequired().HasMaxLength(500);

        // Booking taken on the invoice (BookingsMB_Engine.sql)
        builder.Property(x => x.BookingNo).IsRequired().HasMaxLength(40);

        builder.Property(x => x.BookingAdvance).HasPrecision(18, 2);
    }


    public void Configure(
        EntityTypeBuilder<SalesInvoicesMbLines> builder)
    {
        SalesInvoiceModel.ConfigureLine(builder, "SalesInvoicesMbLines");

        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ColorName).IsRequired().HasMaxLength(50);

        builder.Property(x => x.CkdStatus).IsRequired().HasMaxLength(5);

        builder.Property(x => x.DeliveryStatus).IsRequired().HasMaxLength(20);

        builder.Property(x => x.DeliveredDate).HasColumnType("date");

        builder.Property(x => x.IsRegistered).IsRequired();

        // SalesInvoicesMB_VatPayable.sql
        builder.Property(x => x.VatPayable).HasPrecision(18, 2);

        builder.HasIndex(x => x.MotorBikeUnitId).HasDatabaseName("IX_SalesInvoicesMbLines_MotorBikeUnitId");
    }


    public void Configure(
        EntityTypeBuilder<SalesInvoicesMbPayments> builder)
    {
        SalesInvoiceModel.ConfigurePayment(builder, "SalesInvoicesMbPayments");
    }
}
