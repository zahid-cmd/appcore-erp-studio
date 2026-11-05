//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.GeneralSettings;


//===============================================================
// Website Configuration tables (WebsiteConfiguration_Tables.sql)
//===============================================================


public class WebsiteConfigurationsConfiguration
    : IEntityTypeConfiguration<WebsiteConfigurations>
{
    public void Configure(
        EntityTypeBuilder<WebsiteConfigurations> builder)
    {
        builder.ToTable("WebsiteConfigurations");

        builder.HasKey(x => x.WebsiteConfigurationId);

        builder.Property(x => x.WebsiteConfigurationId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.DefaultTheme)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.Template)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.Tagline)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.About)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.Hotline)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.WhatsApp)
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.Email)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.MapQuery)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.MapLink)
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.FacebookUrl)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.YoutubeUrl)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.InstagramUrl)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.TiktokUrl)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.WhyPhotoPath)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.HeroPhotoPath)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.HeroRoundPath)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.HeroTitle)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.HeroText)
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.EmiDownPercents)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.EmiMonths)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.EmiNote)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.EmiExamplePrice)
               .HasPrecision(14, 2);

        builder.Property(x => x.CurrencySymbol)
               .IsRequired()
               .HasMaxLength(5);

        builder.Property(x => x.OfferTitle)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.OfferText)
               .IsRequired()
               .HasMaxLength(300);
    }
}


public class WebsiteOpeningHoursConfiguration
    : IEntityTypeConfiguration<WebsiteOpeningHours>
{
    public void Configure(
        EntityTypeBuilder<WebsiteOpeningHours> builder)
    {
        builder.ToTable("WebsiteOpeningHours");

        builder.HasKey(x => x.WebsiteOpeningHourId);

        builder.Property(x => x.WebsiteOpeningHourId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Days)
               .IsRequired()
               .HasMaxLength(80);

        builder.Property(x => x.OpensAt)
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.ClosesAt)
               .IsRequired()
               .HasMaxLength(10);
    }
}


public class WebsiteContentItemsConfiguration
    : IEntityTypeConfiguration<WebsiteContentItems>
{
    public void Configure(
        EntityTypeBuilder<WebsiteContentItems> builder)
    {
        builder.ToTable("WebsiteContentItems");

        builder.HasKey(x => x.WebsiteContentItemId);

        builder.Property(x => x.WebsiteContentItemId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Kind)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.Title)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Text)
               .IsRequired()
               .HasMaxLength(2000);

        builder.Property(x => x.PhotoPath)
               .IsRequired()
               .HasMaxLength(300);
    }
}


public class WebsiteBrandsConfiguration
    : IEntityTypeConfiguration<WebsiteBrands>
{
    public void Configure(
        EntityTypeBuilder<WebsiteBrands> builder)
    {
        builder.ToTable("WebsiteBrands");

        builder.HasKey(x => x.WebsiteBrandId);

        builder.Property(x => x.WebsiteBrandId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.About)
               .IsRequired()
               .HasMaxLength(1000);

        builder.HasIndex(x => x.BrandManagementId)
               .IsUnique()
               .HasDatabaseName("IX_WebsiteBrands_Brand");
    }
}


public class WebsiteBranchBrandsConfiguration
    : IEntityTypeConfiguration<WebsiteBranchBrands>
{
    public void Configure(
        EntityTypeBuilder<WebsiteBranchBrands> builder)
    {
        builder.ToTable("WebsiteBranchBrands");

        builder.HasKey(x => x.WebsiteBranchBrandId);

        builder.Property(x => x.WebsiteBranchBrandId)
               .ValueGeneratedOnAdd();

        builder.HasIndex(x => new { x.BranchId, x.BrandManagementId })
               .IsUnique()
               .HasDatabaseName("IX_WebsiteBranchBrands_Pair");
    }
}


public class WebsitePoliciesConfiguration
    : IEntityTypeConfiguration<WebsitePolicies>
{
    public void Configure(
        EntityTypeBuilder<WebsitePolicies> builder)
    {
        builder.ToTable("WebsitePolicies");

        builder.HasKey(x => x.WebsitePolicyId);

        builder.Property(x => x.WebsitePolicyId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.PolicyKey)
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.Title)
               .IsRequired()
               .HasMaxLength(150);

        builder.HasIndex(x => new { x.PolicyKey, x.BrandManagementId })
               .IsUnique()
               .HasDatabaseName("IX_WebsitePolicies_KeyBrand");
    }
}


public class WebsitePolicySectionsConfiguration
    : IEntityTypeConfiguration<WebsitePolicySections>
{
    public void Configure(
        EntityTypeBuilder<WebsitePolicySections> builder)
    {
        builder.ToTable("WebsitePolicySections");

        builder.HasKey(x => x.WebsitePolicySectionId);

        builder.Property(x => x.WebsitePolicySectionId)
               .ValueGeneratedOnAdd();

        builder.Property(x => x.Heading)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Text)
               .IsRequired()
               .HasMaxLength(4000);
    }
}
