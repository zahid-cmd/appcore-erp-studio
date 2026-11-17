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
// Service Operations, service estimates : EF configuration (tables
// made by ServiceOperations_Estimates_Engine.sql; hand-written
// page, no Code Sync). No database defaults for booleans : EF
// would skip a 'false' value on insert.
//===============================================================

public class ServiceEstimateConfigurations
    : IEntityTypeConfiguration<ServiceEstimates>,
      IEntityTypeConfiguration<ServiceEstimateLines>
{
    public void Configure(EntityTypeBuilder<ServiceEstimates> builder)
    {
        builder.ToTable("ServiceEstimates");

        builder.HasKey(x => x.ServiceEstimateId);

        builder.Property(x => x.ServiceEstimateId).ValueGeneratedOnAdd();
        builder.Property(x => x.EstimateNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Version).IsRequired();
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Mobile).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.RegistrationNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ColorName).IsRequired().HasMaxLength(60);
        builder.Property(x => x.Requirement).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.ChargeName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ChargeAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ChargeVatRate).IsRequired().HasPrecision(9, 4);
        builder.Property(x => x.ChargeVatAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ChargeTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ChargeIncomeLedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ChargeVatLedgerCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ChargeCollected).IsRequired();
        builder.Property(x => x.ChargeReceiptVoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ChargeInvoiceNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.StatusNote).IsRequired().HasMaxLength(300);
        builder.Property(x => x.LabourTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PartsTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.GrandTotal).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<ServiceEstimateLines> builder)
    {
        builder.ToTable("ServiceEstimateLines");

        builder.HasKey(x => x.ServiceEstimateLineId);

        builder.Property(x => x.ServiceEstimateLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.LineType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Rate).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.IsFree).IsRequired();
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }
}
