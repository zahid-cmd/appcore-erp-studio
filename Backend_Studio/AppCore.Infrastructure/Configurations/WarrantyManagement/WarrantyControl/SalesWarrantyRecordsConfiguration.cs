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
// Sales Warranty Records : EF configurations (tables made by
// BikeDeliveries_Pdi_Engine.sql). The DbSets are in AppDbContext
// (MANUAL).
//===============================================================

public class SalesWarrantyRecordsConfiguration
    : IEntityTypeConfiguration<SalesWarrantyRecords>,
      IEntityTypeConfiguration<SalesWarrantyRecordParts>
{
    public void Configure(EntityTypeBuilder<SalesWarrantyRecords> builder)
    {
        builder.ToTable("SalesWarrantyRecords");
        builder.HasKey(x => x.SalesWarrantyRecordId);
        builder.Property(x => x.SalesWarrantyRecordId).ValueGeneratedOnAdd();
        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();
        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_SalesWarrantyRecords_PublicId");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(30);
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("UX_SalesWarrantyRecords_Code");
        builder.Property(x => x.SourceType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SalesInvoiceNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.CustomerPhone).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);
        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.PolicyCode).IsRequired().HasMaxLength(20);
        builder.Property(x => x.PolicyName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.StartDate).HasColumnType("date");
        builder.Property(x => x.ExpiryDate).HasColumnType("date");
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.VoidReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
        builder.Property(x => x.CreatedBy).IsRequired();
        builder.Property(x => x.CreatedDate).IsRequired();
        builder.HasIndex(x => new { x.SourceType, x.SourceId }).HasDatabaseName("IX_SalesWarrantyRecords_Source");
    }

    public void Configure(EntityTypeBuilder<SalesWarrantyRecordParts> builder)
    {
        builder.ToTable("SalesWarrantyRecordParts");
        builder.HasKey(x => x.SalesWarrantyRecordPartId);
        builder.Property(x => x.SalesWarrantyRecordPartId).ValueGeneratedOnAdd();
        builder.Property(x => x.PartName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ExpiryDate).HasColumnType("date");
        builder.Property(x => x.Notes).IsRequired().HasMaxLength(200);
        builder.HasIndex(x => x.SalesWarrantyRecordId).HasDatabaseName("IX_SalesWarrantyRecordParts_Record");
    }
}
