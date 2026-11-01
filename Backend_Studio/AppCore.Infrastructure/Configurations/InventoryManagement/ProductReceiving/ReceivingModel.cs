//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InventoryManagement.ProductReceiving;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.ProductReceiving;


//===============================================================
// Receiving model : columns and sizes shared by every Product
// Receiving page (tables made by ProductReceiving_Engine.sql).
// Each page's configuration calls these with its table names.
//===============================================================

public static class ReceivingModel
{
    //===========================================================
    // Header
    //===========================================================

    public static void ConfigureHeader<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : ReceivingHeader
    {
        builder.ToTable(table);

        builder.HasKey(x => x.ReceivingId);

        builder.Property(x => x.ReceivingId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PageType)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.ReceivingNo)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.ReceivingDate)
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

        builder.Property(x => x.WarehouseId)
               .IsRequired();

        builder.Property(x => x.WarehouseName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.PurchaseId)
               .IsRequired();

        builder.Property(x => x.PurchaseNo)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.PurchaseDate)
               .IsRequired();

        builder.Property(x => x.SupplierCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.SupplierName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.SupplierInvoiceNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.MushakNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.DoReference)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.GatePassNo)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.ReceivedBy)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.TotalQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.CancelReason)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }


    //===========================================================
    // Lines
    //===========================================================

    public static void ConfigureLine<T>(
        EntityTypeBuilder<T> builder,
        string table)
        where T : ReceivingLine
    {
        builder.ToTable(table);

        builder.HasKey(x => x.ReceivingLineId);

        builder.Property(x => x.ReceivingLineId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.ReceivingId)
               .IsRequired();

        builder.Property(x => x.LineNo)
               .IsRequired();

        builder.Property(x => x.PurchaseLineId)
               .IsRequired();

        builder.Property(x => x.StockBatchId)
               .IsRequired();

        builder.Property(x => x.BatchNo)
               .IsRequired()
               .HasMaxLength(50);

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

        builder.Property(x => x.PurchasedQuantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.ReceivedBefore)
               .HasPrecision(18, 2);

        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);

        builder.Property(x => x.UnitCost)
               .HasPrecision(18, 4);

        builder.Property(x => x.RackManagementId);

        builder.Property(x => x.RackCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.ShelfNumber)
               .IsRequired();

        builder.Property(x => x.ShortNotes)
               .IsRequired()
               .HasMaxLength(200);
    }
}
