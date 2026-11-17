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
// Service Operations : Parts Outsourcing (table made by
// ServiceOperations_Outsourced_Parts.sql; hand-written, no Code
// Sync)
//===============================================================

public class WorkshopOutsourcedPartsConfigurations
    : IEntityTypeConfiguration<JobCardOutsourcedParts>
{
    public void Configure(EntityTypeBuilder<JobCardOutsourcedParts> builder)
    {
        builder.ToTable("JobCardOutsourcedParts");
        builder.HasKey(x => x.JobCardOutsourcedPartId);
        builder.Property(x => x.JobCardOutsourcedPartId).ValueGeneratedOnAdd();
        builder.Property(x => x.PurchaseNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ItemKind).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ItemCode).IsRequired().HasMaxLength(40);
        builder.Property(x => x.ItemName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.SupplierCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.VendorName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.BillNo).IsRequired().HasMaxLength(60);
        builder.Property(x => x.Quantity).HasPrecision(18, 2);
        builder.Property(x => x.CostRate).HasPrecision(18, 2);
        builder.Property(x => x.CostAmount).HasPrecision(18, 2);
        builder.Property(x => x.Mrp).HasPrecision(18, 2);
        builder.Property(x => x.SellRate).HasPrecision(18, 2);
        builder.Property(x => x.SellAmount).HasPrecision(18, 2);
        builder.Property(x => x.WipLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.PayableLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(300);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }
}
