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
// Promotional Offers / targets / prizes : EF configuration
// (PromotionalOffers_Engine.sql; hand-written pages)
//===============================================================

public class PromotionalOffersConfiguration
    : IEntityTypeConfiguration<PromotionalOffers>
{
    public void Configure(EntityTypeBuilder<PromotionalOffers> builder)
    {
        builder.ToTable("PromotionalOffers");

        builder.HasKey(x => x.PromotionalOfferId);

        builder.Property(x => x.PromotionalOfferId).ValueGeneratedOnAdd();

        builder.Property(x => x.PublicId).HasDefaultValueSql("uuidv7()").ValueGeneratedOnAdd();

        builder.HasIndex(x => x.PublicId).IsUnique().HasDatabaseName("UX_PromotionalOffers_PublicId");

        builder.Property(x => x.Channel).IsRequired().HasMaxLength(20);

        builder.Property(x => x.OfferNo).IsRequired().HasMaxLength(20);

        builder.HasIndex(x => x.OfferNo).IsUnique().HasDatabaseName("UX_PromotionalOffers_No");

        builder.Property(x => x.OfferName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.OfferType).IsRequired().HasMaxLength(30);

        builder.Property(x => x.BrandName).IsRequired().HasMaxLength(100);

        builder.Property(x => x.FundedBy).IsRequired().HasMaxLength(20);

        builder.Property(x => x.StartDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.EndDate).IsRequired().HasColumnType("date");

        builder.Property(x => x.BranchIds).IsRequired().HasMaxLength(1000);

        builder.Property(x => x.DiscountType).IsRequired().HasMaxLength(10);

        builder.Property(x => x.DiscountValue).HasPrecision(18, 2);

        builder.Property(x => x.Terms).IsRequired().HasMaxLength(1000);

        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);

        builder.Property(x => x.StatusReason).IsRequired().HasMaxLength(500);

        builder.Property(x => x.LedgerCode).IsRequired().HasMaxLength(30);

        builder.Property(x => x.LedgerName).IsRequired().HasMaxLength(200);
    }
}


public class PromotionalOfferTargetsConfiguration
    : IEntityTypeConfiguration<PromotionalOfferTargets>
{
    public void Configure(EntityTypeBuilder<PromotionalOfferTargets> builder)
    {
        builder.ToTable("PromotionalOfferTargets");

        builder.HasKey(x => x.PromotionalOfferTargetId);

        builder.Property(x => x.PromotionalOfferTargetId).ValueGeneratedOnAdd();

        builder.Property(x => x.TargetType).IsRequired().HasMaxLength(20);

        builder.Property(x => x.TargetName).IsRequired().HasMaxLength(250);

        builder.Property(x => x.IsExcluded).IsRequired();

        builder.Property(x => x.DiscountType).HasMaxLength(10);

        builder.Property(x => x.DiscountValue).HasPrecision(18, 2);

        builder.HasIndex(x => x.PromotionalOfferId).HasDatabaseName("IX_PromotionalOfferTargets_Offer");
    }
}


public class PromotionalOfferPrizesConfiguration
    : IEntityTypeConfiguration<PromotionalOfferPrizes>
{
    public void Configure(EntityTypeBuilder<PromotionalOfferPrizes> builder)
    {
        builder.ToTable("PromotionalOfferPrizes");

        builder.HasKey(x => x.PromotionalOfferPrizeId);

        builder.Property(x => x.PromotionalOfferPrizeId).ValueGeneratedOnAdd();

        builder.Property(x => x.PrizeName).IsRequired().HasMaxLength(150);

        builder.Property(x => x.PrizeKind).IsRequired().HasMaxLength(20);

        builder.Property(x => x.PrizeValue).HasPrecision(18, 2);

        builder.HasIndex(x => x.PromotionalOfferId).HasDatabaseName("IX_PromotionalOfferPrizes_Offer");
    }
}
