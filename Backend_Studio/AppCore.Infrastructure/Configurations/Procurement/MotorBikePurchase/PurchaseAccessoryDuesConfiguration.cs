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
// Accessories due from the supplier / received
// (PurchaseAccessoryDues_Tables.sql)
//===============================================================

public class PurchaseAccessoryDuesConfiguration
    : IEntityTypeConfiguration<PurchaseAccessoryDues>
{
    public void Configure(
        EntityTypeBuilder<PurchaseAccessoryDues> builder)
    {
        builder.ToTable("PurchaseAccessoryDues");

        builder.HasKey(x => x.PurchaseAccessoryDueId);

        builder.Property(x => x.PurchaseAccessoryDueId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).IsRequired().HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_PurchaseAccessoryDues_PublicId");

        builder.Property(x => x.PurchaseNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.SupplierCode).IsRequired().HasMaxLength(50);
        builder.Property(x => x.SupplierName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.SchemeCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.SchemeName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.SchemeKind).IsRequired().HasMaxLength(20);
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(50);
        builder.Property(x => x.AccessoryName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(30);
        builder.Property(x => x.BikeQuantity).HasPrecision(18, 2);
        builder.Property(x => x.QuantityDue).HasPrecision(18, 2);
        builder.Property(x => x.QuantityReceived).HasPrecision(18, 2);
        builder.Property(x => x.QuantityClosed).HasPrecision(18, 2);
        builder.Property(x => x.CloseReason).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => new { x.PurchaseId, x.BikeAccessorySchemeId, x.AccessoryId })
               .IsUnique()
               .HasDatabaseName("UX_PurchaseAccessoryDues_Purchase_Scheme_Accessory");

        builder.HasIndex(x => new { x.BranchId, x.Status })
               .HasDatabaseName("IX_PurchaseAccessoryDues_Branch_Status");
    }
}


public class PurchaseAccessoryReceiptsConfiguration
    : IEntityTypeConfiguration<PurchaseAccessoryReceipts>
{
    public void Configure(
        EntityTypeBuilder<PurchaseAccessoryReceipts> builder)
    {
        builder.ToTable("PurchaseAccessoryReceipts");

        builder.HasKey(x => x.PurchaseAccessoryReceiptId);

        builder.Property(x => x.PurchaseAccessoryReceiptId).ValueGeneratedOnAdd();

        builder.Property(x => x.ReceivingNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(50);
        builder.Property(x => x.AccessoryName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Unit).IsRequired().HasMaxLength(30);
        builder.Property(x => x.BatchNo).IsRequired().HasMaxLength(50);
        builder.Property(x => x.Quantity).HasPrecision(18, 2);

        builder.HasIndex(x => x.ReceivingId).HasDatabaseName("IX_PurchaseAccessoryReceipts_Receiving");

        builder.HasIndex(x => x.PurchaseAccessoryDueId).HasDatabaseName("IX_PurchaseAccessoryReceipts_Due");
    }
}
