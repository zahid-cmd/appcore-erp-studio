//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries : the delivery and its PDI answers (replaces
// the generated configuration; tables made by
// BikeDeliveries_Pdi_Engine.sql). The head keeps the sync's AUTO
// DbSet; the answers have a MANUAL DbSet. No database defaults
// for booleans : EF would skip a 'false' value on insert.
//===============================================================

public class BikeDeliveriesConfiguration
    : IEntityTypeConfiguration<BikeDeliveries>,
      IEntityTypeConfiguration<BikeDeliveryAnswers>
{
    public void Configure(EntityTypeBuilder<BikeDeliveries> builder)
    {
        builder.ToTable("BikeDeliveries");
        builder.HasKey(x => x.BikeDeliveryId);
        builder.Property(x => x.BikeDeliveryId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_BikeDeliveries_PublicId");
        builder.Property(x => x.DeliveryNo).IsRequired().HasMaxLength(40);
        builder.HasIndex(x => x.DeliveryNo).IsUnique().HasDatabaseName("UX_BikeDeliveries_DeliveryNo");
        builder.Property(x => x.BranchName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.SalesInvoiceNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.SalesInvoiceDate).HasColumnType("date");
        builder.Property(x => x.CustomerCode).IsRequired().HasMaxLength(20);
        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.CustomerPhone).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.ModelName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ColorName).IsRequired().HasMaxLength(50);
        builder.Property(x => x.IsElectric).IsRequired();
        builder.Property(x => x.DeliveryDate).HasColumnType("date");
        builder.Property(x => x.ReceivedBy).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ReceiverName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.ReceiverPhone).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.PdiTemplateCode).IsRequired().HasMaxLength(20);
        builder.Property(x => x.PdiTemplateName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.PdiDate).HasColumnType("date");
        builder.Property(x => x.TechnicianName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.ProblemsFound).IsRequired().HasMaxLength(2000);
        builder.Property(x => x.PdiRemarks).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.UndoReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
        builder.HasIndex(x => x.SalesInvoiceId).HasDatabaseName("IX_BikeDeliveries_Invoice");
    }

    public void Configure(EntityTypeBuilder<BikeDeliveryAnswers> builder)
    {
        builder.ToTable("BikeDeliveryAnswers");
        builder.HasKey(x => x.BikeDeliveryAnswerId);
        builder.Property(x => x.BikeDeliveryAnswerId).ValueGeneratedOnAdd();
        builder.Property(x => x.SectionTitle).IsRequired().HasMaxLength(150);
        builder.Property(x => x.SectionTitleBn).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.HasComments).IsRequired();
        builder.Property(x => x.ItemText).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ItemTextBn).IsRequired().HasMaxLength(2000);
        builder.Property(x => x.ItemType).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(20);
        builder.Property(x => x.IsRequired).IsRequired();
        builder.Property(x => x.Answer).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Remark).IsRequired().HasMaxLength(500);
        builder.Property(x => x.TechnicianComment).IsRequired().HasMaxLength(500);
        builder.Property(x => x.QcComment).IsRequired().HasMaxLength(500);
        builder.HasIndex(x => new { x.BikeDeliveryId, x.SectionOrder, x.ItemOrder }).HasDatabaseName("IX_BikeDeliveryAnswers_Delivery");
    }
}
