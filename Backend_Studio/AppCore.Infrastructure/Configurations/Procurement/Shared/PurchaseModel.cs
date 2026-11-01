//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Procurement.Shared;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.Shared;


//===============================================================
// Purchase model : columns and sizes shared by every Purchases
// page (tables made by Purchases_Shared.sql). Each page's
// configuration calls these with its own table names.
//===============================================================

public static class PurchaseModel
{
    //===========================================================
    // Header
    //===========================================================

    public static void ConfigureHeader<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : PurchaseHeader
    {
        builder.ToTable(table);

        builder.HasKey(x => x.PurchaseId);

        builder.Property(x => x.PurchaseId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PageType)
               .IsRequired()
               .HasMaxLength(5);
        builder.Property(x => x.PurchaseNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.PurchaseDate)
               .IsRequired();
        builder.Property(x => x.BranchId)
               .IsRequired();
        builder.Property(x => x.BranchCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.BranchName)
               .IsRequired()
               .HasMaxLength(150);
        builder.Property(x => x.FinancialYearId)
               .IsRequired();
        builder.Property(x => x.SupplierCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.SupplierName)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.PurchaseOrderId);
        builder.Property(x => x.OrderNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.SupplierInvoiceNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.SupplierInvoiceDate);
        builder.Property(x => x.MushakNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.MushakDate);
        builder.Property(x => x.DoReference)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.GatePassNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.WarehouseId);
        builder.Property(x => x.WarehouseName)
               .IsRequired()
               .HasMaxLength(150);
        builder.Property(x => x.PriceIncludesVat)
               .IsRequired();
        builder.Property(x => x.InvoicePriceBasis)
               .IsRequired()
               .HasMaxLength(5);
        builder.Property(x => x.ProfitBasis)
               .IsRequired()
               .HasMaxLength(5);
        builder.Property(x => x.DefaultProfitPercent)
               .HasPrecision(7, 2);
        builder.Property(x => x.AdditionalDiscountType)
               .IsRequired()
               .HasMaxLength(10);
        builder.Property(x => x.AdditionalDiscountValue)
               .HasPrecision(18, 2);
        builder.Property(x => x.AdditionalDiscountAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.RoundingMethod)
               .IsRequired()
               .HasMaxLength(10);
        builder.Property(x => x.RoundingAdjustment)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalQuantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalFreeQuantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalMrp)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalProfit)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalDp)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalVat)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalVatClaimable)
               .HasPrecision(18, 2);
        builder.Property(x => x.TotalPayable)
               .HasPrecision(18, 2);
        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(1000);
        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.VoucherNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.CancelReason)
               .IsRequired()
               .HasMaxLength(500);
        builder.Property(x => x.CreatedBy)
               .IsRequired();
        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }


    //===========================================================
    // Line
    //===========================================================

    public static void ConfigureLine<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : PurchaseLine
    {
        builder.ToTable(table);

        builder.HasKey(x => x.PurchaseLineId);

        builder.Property(x => x.PurchaseLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PurchaseId)
               .IsRequired();
        builder.Property(x => x.LineNo)
               .IsRequired();
        builder.Property(x => x.PurchaseOrderLineId);
        builder.Property(x => x.ProductType)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.ProductId)
               .IsRequired();
        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.Unit)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.FreeQuantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.Mrp)
               .HasPrecision(18, 2);
        builder.Property(x => x.ProfitPercent)
               .HasPrecision(7, 2);
        builder.Property(x => x.UnitPrice)
               .HasPrecision(18, 4);
        builder.Property(x => x.GrossMrp)
               .HasPrecision(18, 2);
        builder.Property(x => x.DpAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.ProfitAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.DiscountShare)
               .HasPrecision(18, 2);
        builder.Property(x => x.NetAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.VatRate)
               .HasPrecision(7, 2);
        builder.Property(x => x.Amount)
               .HasPrecision(18, 2);
        builder.Property(x => x.VatAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.LineTotal)
               .HasPrecision(18, 2);
        builder.Property(x => x.RoundingShare)
               .HasPrecision(18, 2);
        builder.Property(x => x.NetUnitCost)
               .HasPrecision(18, 4);
        builder.Property(x => x.ReturnedQuantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(200);
    }


    //===========================================================
    // Motor bike units (table MotorBikeUnits)
    //===========================================================

    public static void ConfigureUnits(
        EntityTypeBuilder<MotorBikeUnitsEntity> builder)
    {
        builder.ToTable("MotorBikeUnits");

        builder.HasKey(x => x.MotorBikeUnitId);

        builder.Property(x => x.MotorBikeUnitId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ProductId)
               .IsRequired();
        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.ChassisNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.EngineNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.KeyNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.BatteryNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.BranchId)
               .IsRequired();
        builder.Property(x => x.PurchaseId)
               .IsRequired();
        builder.Property(x => x.PurchaseLineId)
               .IsRequired();
        builder.Property(x => x.PurchaseNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.SupplierCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.UnitCost)
               .HasPrecision(18, 4);
        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.CreatedBy)
               .IsRequired();
        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}
