//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.FixedAssetsManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.FixedAssetsManagement;


//===============================================================
// Fixed Assets Management : EF configuration (tables made by
// FixedAssets_Engine.sql; hand-written pages, no Code Sync). No
// database defaults for booleans : EF would skip a 'false' value
// on insert.
//===============================================================

public class FaConfigurations
    : IEntityTypeConfiguration<FaCategories>,
      IEntityTypeConfiguration<FaLocations>,
      IEntityTypeConfiguration<FaConfiguration>,
      IEntityTypeConfiguration<FaAssets>,
      IEntityTypeConfiguration<FaAcquisitions>,
      IEntityTypeConfiguration<FaAcquisitionLines>,
      IEntityTypeConfiguration<FaDepreciationRuns>,
      IEntityTypeConfiguration<FaDepreciationLines>,
      IEntityTypeConfiguration<FaDisposals>,
      IEntityTypeConfiguration<FaVerifications>,
      IEntityTypeConfiguration<FaVerificationLines>
{
    public void Configure(EntityTypeBuilder<FaCategories> builder)
    {
        builder.ToTable("FaCategories");
        builder.HasKey(x => x.FaCategoryId);
        builder.Property(x => x.FaCategoryId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.GroupName).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Method).IsRequired().HasMaxLength(20);
        builder.Property(x => x.RatePercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.ResidualPercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.CostLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.AccumLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ExpenseLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.GainLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.LossLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.CapitalThreshold).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.AllowGroupCard).IsRequired();
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FaLocations> builder)
    {
        builder.ToTable("FaLocations");
        builder.HasKey(x => x.FaLocationId);
        builder.Property(x => x.FaLocationId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FaConfiguration> builder)
    {
        builder.ToTable("FaConfiguration");
        builder.HasKey(x => x.FaConfigurationId);
        builder.Property(x => x.FaConfigurationId).ValueGeneratedOnAdd();
        builder.Property(x => x.RequireLocation).IsRequired();
        builder.Property(x => x.RequireCustodian).IsRequired();
        builder.Property(x => x.AllowAssetRule).IsRequired();
        builder.Property(x => x.AllowRunningMonth).IsRequired();
        builder.Property(x => x.AssetNoPrefix).IsRequired().HasMaxLength(10);
        builder.Property(x => x.PpeSubGroupCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.AcdSubGroupCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.PayableSubGroupCode).IsRequired().HasMaxLength(30);
    }

    public void Configure(EntityTypeBuilder<FaAssets> builder)
    {
        builder.ToTable("FaAssets");
        builder.HasKey(x => x.FaAssetId);
        builder.Property(x => x.FaAssetId).ValueGeneratedOnAdd();
        builder.Property(x => x.AssetNo).IsRequired().HasMaxLength(40);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Description).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Brand).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Model).IsRequired().HasMaxLength(100);
        builder.Property(x => x.SerialNo).IsRequired().HasMaxLength(100);
        builder.Property(x => x.SupplierName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.PurchaseRef).IsRequired().HasMaxLength(60);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.Cost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ImprovementCost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.ResidualValue).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Method).IsRequired().HasMaxLength(20);
        builder.Property(x => x.RatePercent).IsRequired().HasPrecision(7, 3);
        builder.Property(x => x.OpeningAccumulated).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.AccumulatedDepreciation).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Source).IsRequired().HasMaxLength(15);
        builder.Property(x => x.JournalVoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FaAcquisitions> builder)
    {
        builder.ToTable("FaAcquisitions");
        builder.HasKey(x => x.FaAcquisitionId);
        builder.Property(x => x.FaAcquisitionId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.SupplierName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.RefNo).IsRequired().HasMaxLength(60);
        builder.Property(x => x.CreditLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.CreditLedgerType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.TotalAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.JournalVoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FaAcquisitionLines> builder)
    {
        builder.ToTable("FaAcquisitionLines");
        builder.HasKey(x => x.FaAcquisitionLineId);
        builder.Property(x => x.FaAcquisitionLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.Name).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Brand).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Model).IsRequired().HasMaxLength(100);
        builder.Property(x => x.SerialNo).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Quantity).IsRequired().HasPrecision(10, 2);
        builder.Property(x => x.UnitCost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.CardMode).IsRequired().HasMaxLength(10);
    }

    public void Configure(EntityTypeBuilder<FaDepreciationRuns> builder)
    {
        builder.ToTable("FaDepreciationRuns");
        builder.HasKey(x => x.FaDepreciationRunId);
        builder.Property(x => x.FaDepreciationRunId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.TotalAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.JournalVoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FaDepreciationLines> builder)
    {
        builder.ToTable("FaDepreciationLines");
        builder.HasKey(x => x.FaDepreciationLineId);
        builder.Property(x => x.FaDepreciationLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.Cost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.OpeningAccumulated).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Charge).IsRequired().HasPrecision(18, 2);
    }

    public void Configure(EntityTypeBuilder<FaDisposals> builder)
    {
        builder.ToTable("FaDisposals");
        builder.HasKey(x => x.FaDisposalId);
        builder.Property(x => x.FaDisposalId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Kind).IsRequired().HasMaxLength(15);
        builder.Property(x => x.BuyerName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.SalePrice).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.DebitLedgerCode).IsRequired().HasMaxLength(30);
        builder.Property(x => x.DebitLedgerType).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Cost).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.Accumulated).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.BookValue).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.GainLoss).IsRequired().HasPrecision(18, 2);
        builder.Property(x => x.PrevStatus).IsRequired().HasMaxLength(20);
        builder.Property(x => x.JournalVoucherNo).IsRequired().HasMaxLength(30);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FaVerifications> builder)
    {
        builder.ToTable("FaVerifications");
        builder.HasKey(x => x.FaVerificationId);
        builder.Property(x => x.FaVerificationId).ValueGeneratedOnAdd();
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(10);
        builder.Property(x => x.ExtraItems).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.Remarks).IsRequired().HasMaxLength(500);
        builder.Property(x => x.IsDeleted).IsRequired();
    }

    public void Configure(EntityTypeBuilder<FaVerificationLines> builder)
    {
        builder.ToTable("FaVerificationLines");
        builder.HasKey(x => x.FaVerificationLineId);
        builder.Property(x => x.FaVerificationLineId).ValueGeneratedOnAdd();
        builder.Property(x => x.Result).IsRequired().HasMaxLength(10);
        builder.Property(x => x.Note).IsRequired().HasMaxLength(200);
    }
}
