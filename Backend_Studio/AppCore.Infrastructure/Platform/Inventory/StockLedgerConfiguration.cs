//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Platform.Inventory;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Inventory;


//===============================================================
// StockBatches
//===============================================================

public class StockBatchesConfiguration
    : IEntityTypeConfiguration<StockBatches>
{
    public void Configure(
        EntityTypeBuilder<StockBatches> builder)
    {
        builder.ToTable("StockBatches");

        builder.HasKey(x => x.StockBatchId);

        builder.Property(x => x.StockBatchId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.BatchNo)
               .IsRequired()
               .HasMaxLength(40);
        builder.Property(x => x.ProductType)
               .IsRequired()
               .HasMaxLength(5);
        builder.Property(x => x.ProductId)
               .IsRequired();
        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(40);
        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(250);
        builder.Property(x => x.InventoryLedgerCode)
               .IsRequired()
               .HasMaxLength(40);
        builder.Property(x => x.SourceType)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.SourceId)
               .IsRequired();
        builder.Property(x => x.SourceLineId)
               .IsRequired();
        builder.Property(x => x.SourceNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.SourceDate)
               .IsRequired();
        builder.Property(x => x.SupplierCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.BranchId)
               .IsRequired();
        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.UnitCost)
               .HasPrecision(18, 4);
        builder.Property(x => x.TotalValue)
               .HasPrecision(18, 2);
        builder.Property(x => x.QuantityInTransit)
               .HasPrecision(18, 2);
        builder.Property(x => x.QuantityOnHand)
               .HasPrecision(18, 2);
        builder.Property(x => x.QuantityOut)
               .HasPrecision(18, 2);
        builder.Property(x => x.RemainingValue)
               .HasPrecision(18, 2);
        builder.Property(x => x.SalePrice)
               .HasPrecision(18, 2);
        builder.Property(x => x.Mrp)
               .HasPrecision(18, 2);
        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.CreatedBy)
               .IsRequired();
        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}


//===============================================================
// StockMovements
//===============================================================

public class StockMovementsConfiguration
    : IEntityTypeConfiguration<StockMovements>
{
    public void Configure(
        EntityTypeBuilder<StockMovements> builder)
    {
        builder.ToTable("StockMovements");

        builder.HasKey(x => x.StockMovementId);

        builder.Property(x => x.StockMovementId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.StockBatchId)
               .IsRequired();
        builder.Property(x => x.ProductType)
               .IsRequired()
               .HasMaxLength(5);
        builder.Property(x => x.ProductId)
               .IsRequired();
        builder.Property(x => x.BranchId)
               .IsRequired();
        builder.Property(x => x.WarehouseId);
        builder.Property(x => x.Bucket)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.MovementType)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.QuantityIn)
               .HasPrecision(18, 2);
        builder.Property(x => x.QuantityOut)
               .HasPrecision(18, 2);
        builder.Property(x => x.UnitCost)
               .HasPrecision(18, 4);
        builder.Property(x => x.Value)
               .HasPrecision(18, 2);
        builder.Property(x => x.DocumentType)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.DocumentId)
               .IsRequired();
        builder.Property(x => x.DocumentLineId);
        builder.Property(x => x.DocumentNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.DocumentDate)
               .IsRequired();
        builder.Property(x => x.IsReversal)
               .IsRequired();
        builder.Property(x => x.Narration)
               .IsRequired()
               .HasMaxLength(300);
        builder.Property(x => x.CreatedBy)
               .IsRequired();
        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}


//===============================================================
// StockAllocations
//===============================================================

public class StockAllocationsConfiguration
    : IEntityTypeConfiguration<StockAllocations>
{
    public void Configure(
        EntityTypeBuilder<StockAllocations> builder)
    {
        builder.ToTable("StockAllocations");

        builder.HasKey(x => x.StockAllocationId);

        builder.Property(x => x.StockAllocationId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.StockBatchId)
               .IsRequired();
        builder.Property(x => x.DocumentType)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.DocumentId)
               .IsRequired();
        builder.Property(x => x.DocumentLineId)
               .IsRequired();
        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.UnitCost)
               .HasPrecision(18, 4);
        builder.Property(x => x.Value)
               .HasPrecision(18, 2);
        builder.Property(x => x.IsReversed)
               .IsRequired();
        builder.Property(x => x.CreatedBy)
               .IsRequired();
        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}


//===============================================================
// VatRegister
//===============================================================

public class VatRegisterConfiguration
    : IEntityTypeConfiguration<VatRegister>
{
    public void Configure(
        EntityTypeBuilder<VatRegister> builder)
    {
        builder.ToTable("VatRegister");

        builder.HasKey(x => x.VatRegisterId);

        builder.Property(x => x.VatRegisterId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Direction)
               .IsRequired()
               .HasMaxLength(10);
        builder.Property(x => x.DocumentType)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.DocumentId)
               .IsRequired();
        builder.Property(x => x.DocumentLineId);
        builder.Property(x => x.DocumentNo)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.DocumentDate)
               .IsRequired();
        builder.Property(x => x.MushakNo)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(x => x.MushakDate);
        builder.Property(x => x.PartyType)
               .IsRequired()
               .HasMaxLength(20);
        builder.Property(x => x.PartyCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.PartyName)
               .IsRequired()
               .HasMaxLength(200);
        builder.Property(x => x.PartyBin)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.BranchId)
               .IsRequired();
        builder.Property(x => x.ProductType)
               .IsRequired()
               .HasMaxLength(5);
        builder.Property(x => x.ProductId);
        builder.Property(x => x.ProductCode)
               .IsRequired()
               .HasMaxLength(40);
        builder.Property(x => x.ProductName)
               .IsRequired()
               .HasMaxLength(250);
        builder.Property(x => x.Quantity)
               .HasPrecision(18, 2);
        builder.Property(x => x.TaxableValue)
               .HasPrecision(18, 2);
        builder.Property(x => x.VatRate)
               .HasPrecision(7, 2);
        builder.Property(x => x.VatAmount)
               .HasPrecision(18, 2);
        builder.Property(x => x.VatClaimable)
               .HasPrecision(18, 2);
        builder.Property(x => x.VatLedgerCode)
               .IsRequired()
               .HasMaxLength(30);
        builder.Property(x => x.IsReversal)
               .IsRequired();
        builder.Property(x => x.CreatedBy)
               .IsRequired();
        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}
