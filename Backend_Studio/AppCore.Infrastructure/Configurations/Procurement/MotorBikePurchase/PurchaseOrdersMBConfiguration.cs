//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Procurement.MotorBikePurchase;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Orders Configuration
//
// One class configures the header and its lines (the database
// registers a configuration through its FIRST entity, the header,
// which has the Code Sync DbSet; the lines come with it).
//===============================================================

public class PurchaseOrdersMbConfiguration
    : IEntityTypeConfiguration<PurchaseOrdersMb>,
      IEntityTypeConfiguration<PurchaseOrdersMbLines>
{
    //===========================================================
    // Header
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PurchaseOrdersMb> builder)
    {
        builder.ToTable("PurchaseOrdersMb");

        builder.HasKey(x => x.PurchaseOrderId);

        builder.Property(x => x.PurchaseOrderId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PageType)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.OrderNo)
               .IsRequired()
               .HasMaxLength(40);

        builder.HasIndex(x => x.OrderNo)
               .IsUnique()
               .HasDatabaseName("UX_PurchaseOrdersMb_OrderNo");

        builder.HasIndex(x => new { x.PageType, x.OrderDate })
               .HasDatabaseName("IX_PurchaseOrdersMb_Page_Date");

        builder.Property(x => x.OrderDate)
               .IsRequired();

        builder.Property(x => x.ExpectedDate);

        builder.Property(x => x.BranchId)
               .IsRequired();

        builder.Property(x => x.BranchCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.FinancialYearId)
               .IsRequired();

        builder.Property(x => x.SupplierCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.HasIndex(x => x.SupplierCode)
               .HasDatabaseName("IX_PurchaseOrdersMb_Supplier");

        builder.Property(x => x.SupplierName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.PriceIncludesVat)
               .IsRequired();

        builder.Property(x => x.TotalQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalVat)
               .HasPrecision(18, 2);

        builder.Property(x => x.TotalPayable)
               .HasPrecision(18, 2);

        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.CloseReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }


    //===========================================================
    // Lines
    //===========================================================

    public void Configure(
        EntityTypeBuilder<PurchaseOrdersMbLines> builder)
    {
        builder.ToTable("PurchaseOrdersMbLines");

        builder.HasKey(x => x.PurchaseOrderLineId);

        builder.Property(x => x.PurchaseOrderLineId)
               .ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PurchaseOrderId)
               .HasDatabaseName("IX_PurchaseOrdersMbLines_Order");

        builder.Property(x => x.ProductType)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(250);

        builder.Property(x => x.Unit)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.UnitPrice)
               .HasPrecision(18, 2);

        builder.Property(x => x.VatRate)
               .HasPrecision(5, 2);

        builder.Property(x => x.Amount)
               .HasPrecision(18, 2);

        builder.Property(x => x.VatAmount)
               .HasPrecision(18, 2);

        builder.Property(x => x.LineTotal)
               .HasPrecision(18, 2);

        builder.Property(x => x.BilledQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(250);
    }
}