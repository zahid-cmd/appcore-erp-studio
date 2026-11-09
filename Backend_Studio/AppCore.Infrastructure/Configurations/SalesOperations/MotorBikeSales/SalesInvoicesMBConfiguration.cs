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

        builder.HasIndex(x => x.MotorBikeUnitId).HasDatabaseName("IX_SalesInvoicesMbLines_MotorBikeUnitId");
    }


    public void Configure(
        EntityTypeBuilder<SalesInvoicesMbPayments> builder)
    {
        SalesInvoiceModel.ConfigurePayment(builder, "SalesInvoicesMbPayments");
    }
}
