//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.Shared;


//===============================================================
// Sales Returns / lines : EF configuration (tables made by
// SalesReturns_Engine.sql; hand-written pages)
//===============================================================

public class SalesReturnsConfiguration
    : IEntityTypeConfiguration<SalesReturns>
{
    public void Configure(EntityTypeBuilder<SalesReturns> builder)
    {
        builder.ToTable("SalesReturns");

        builder.HasKey(x => x.SalesReturnId);

        builder.Property(x => x.SalesReturnId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_SalesReturns_PublicId");

        builder.Property(x => x.ProductType).IsRequired().HasMaxLength(2);

        builder.Property(x => x.ReturnNo).IsRequired().HasMaxLength(40);

        builder.Property(x => x.ReturnDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.SalesInvoiceNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.SalesInvoiceDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.CustomerCode).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CustomerName).IsRequired().HasMaxLength(200);

        builder.Property(x => x.CustomerPhone).IsRequired().HasMaxLength(20);

        builder.Property(x => x.ReceivableLedgerCode).IsRequired().HasMaxLength(30);

        builder.Property(x => x.Reason).IsRequired().HasMaxLength(500);

        builder.Property(x => x.Narration).IsRequired().HasMaxLength(500);

        builder.Property(x => x.TotalQuantity).HasPrecision(18, 2);

        builder.Property(x => x.GrossAmount).HasPrecision(18, 2);

        builder.Property(x => x.DiscountAmount).HasPrecision(18, 2);

        builder.Property(x => x.ItemsAmount).HasPrecision(18, 2);

        builder.Property(x => x.RegistrationRefund).HasPrecision(18, 2);

        builder.Property(x => x.ReturnTotal).HasPrecision(18, 2);

        builder.Property(x => x.TotalVatInside).HasPrecision(18, 2);

        builder.Property(x => x.TotalBaseVat).HasPrecision(18, 2);

        builder.Property(x => x.CostAmount).HasPrecision(18, 2);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);

        builder.Property(x => x.VoucherNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.CancelReason).IsRequired().HasMaxLength(500);
    }
}


public class SalesReturnLinesConfiguration
    : IEntityTypeConfiguration<SalesReturnLines>
{
    public void Configure(EntityTypeBuilder<SalesReturnLines> builder)
    {
        builder.ToTable("SalesReturnLines");

        builder.HasKey(x => x.SalesReturnLineId);

        builder.Property(x => x.SalesReturnLineId).ValueGeneratedOnAdd();

        builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(50);

        builder.Property(x => x.PartNumber).IsRequired().HasMaxLength(100);

        builder.Property(x => x.ProductName).IsRequired().HasMaxLength(250);

        builder.Property(x => x.Unit).IsRequired().HasMaxLength(30);

        builder.Property(x => x.ChassisNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.EngineNo).IsRequired().HasMaxLength(50);

        builder.Property(x => x.ColorName).IsRequired().HasMaxLength(50);

        builder.Property(x => x.SoldQuantity).HasPrecision(18, 2);

        builder.Property(x => x.Quantity).HasPrecision(18, 2);

        builder.Property(x => x.UnitPrice).HasPrecision(18, 4);

        builder.Property(x => x.GrossAmount).HasPrecision(18, 2);

        builder.Property(x => x.DiscountSource).IsRequired().HasMaxLength(20);

        builder.Property(x => x.CampaignMembershipAmount).HasPrecision(18, 2);

        builder.Property(x => x.SpecialAmount).HasPrecision(18, 2);

        builder.Property(x => x.FractionalShare).HasPrecision(18, 2);

        builder.Property(x => x.LineTotal).HasPrecision(18, 2);

        builder.Property(x => x.VatRate).HasPrecision(9, 2);

        builder.Property(x => x.VatInside).HasPrecision(18, 2);

        builder.Property(x => x.BaseVat).HasPrecision(18, 2);

        builder.Property(x => x.VatPayable).HasPrecision(18, 2);

        builder.Property(x => x.RegistrationRefund).HasPrecision(18, 2);

        builder.Property(x => x.RegistrationCommission).HasPrecision(18, 2);

        builder.Property(x => x.CostAmount).HasPrecision(18, 2);

        builder.Property(x => x.Restocked).IsRequired();

        builder.Property(x => x.Reason).IsRequired().HasMaxLength(300);

        builder.HasIndex(x => x.SalesReturnId).HasDatabaseName("IX_SalesReturnLines_Return");
    }
}
