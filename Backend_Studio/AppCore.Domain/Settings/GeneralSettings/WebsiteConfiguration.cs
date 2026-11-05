//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Website Configuration (Settings › General Settings)
//
// One row : the public website's switches and texts. Its lists
// live in the tables below. Company, branches, bikes, prices
// and stock are read from their own ERP pages, never copied.
// Tables : WebsiteConfiguration_Tables.sql
//===============================================================

public class WebsiteConfigurations
{
    public long WebsiteConfigurationId { get; set; }

    // General
    public bool IsEnabled { get; set; } = true;
    public string DefaultTheme { get; set; } = "auto";
    public string Template { get; set; } = "website-page-1";
    public string CurrencySymbol { get; set; } = string.Empty; // empty = ৳ (database is WIN1252)
    public string Tagline { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;

    // Contact (empty = taken from the Company page)
    public string Hotline { get; set; } = string.Empty;
    public string WhatsApp { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string MapQuery { get; set; } = string.Empty;   // the pin : "lat,lng" or a place name
    public string MapLink { get; set; } = string.Empty;    // link pasted from Google Maps

    // Social links
    public string FacebookUrl { get; set; } = string.Empty;
    public string YoutubeUrl { get; set; } = string.Empty;
    public string InstagramUrl { get; set; } = string.Empty;
    public string TiktokUrl { get; set; } = string.Empty;

    // Home page sections
    public bool ShowBrandsMenu { get; set; } = true;
    public bool ShowOfferRibbon { get; set; } = true;
    public bool ShowMovingStrip { get; set; } = true;
    public int StripSpeed { get; set; } = 5;   // moving strip : 1 slowest … 10 fastest
    public bool ShowWhyUs { get; set; } = true;
    public bool ShowEmi { get; set; } = true;
    public bool ShowService { get; set; } = true;
    public bool ShowBranches { get; set; } = true;
    public bool ShowFaq { get; set; } = true;

    public string WhyPhotoPath { get; set; } = string.Empty;

    // Hero photo (showroom picture) : empty = the hero as before
    public string HeroPhotoPath { get; set; } = string.Empty;
    public bool HeroWelcome { get; set; } = true;
    public bool HeroBackground { get; set; } = true;
    public int HeroStrength { get; set; } = 2;      // 1 subtle .. 5 strong
    public string HeroTitle { get; set; } = string.Empty;
    public string HeroText { get; set; } = string.Empty;
    public bool HeroShowAddress { get; set; } = true;
    // Round image in the circle behind the bike : empty = off
    public bool HeroRoundOn { get; set; } = true;
    public string HeroRoundPath { get; set; } = string.Empty;
    public int HeroRoundStrength { get; set; } = 2; // 1 subtle .. 5 strong


    // Offer ribbon (until the Sales & Promotion Offers page)
    public string OfferTitle { get; set; } = string.Empty;
    public string OfferText { get; set; } = string.Empty;
    public DateOnly? OfferEndsOn { get; set; }

    // EMI calculator
    public decimal EmiExamplePrice { get; set; }
    public string EmiDownPercents { get; set; } = "10,20,30,50";
    public string EmiMonths { get; set; } = "3,6,12,18,24";
    public string EmiNote { get; set; } = string.Empty;

    // Audit
    public long CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public long? ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Opening hours ("10:00" style; empty when closed)
//===============================================================

public class WebsiteOpeningHours
{
    public long WebsiteOpeningHourId { get; set; }
    public string Days { get; set; } = string.Empty;
    public string OpensAt { get; set; } = string.Empty;
    public string ClosesAt { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public int DisplayOrder { get; set; }
}


//===============================================================
// Simple lists by Kind : tag · why-point · why-stat · service ·
// faq · payment · text (why-stat : Title = number, Text = label;
// faq : Title = question, Text = answer; payment : Title = name,
// PhotoPath = logo; text : Title = key e.g. "why.title", Text =
// the wording shown on the website)
//===============================================================

public class WebsiteContentItems
{
    public long WebsiteContentItemId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string PhotoPath { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}


//===============================================================
// A brand on the website (one per Brand Management brand)
//===============================================================

public class WebsiteBrands
{
    public long WebsiteBrandId { get; set; }
    public long BrandManagementId { get; set; }
    public bool ShowOnWebsite { get; set; } = true;
    public bool ShowBrandPage { get; set; } = true;
    public int DisplayOrder { get; set; }
    public string About { get; set; } = string.Empty;
}


//===============================================================
// A brand a branch sells
//===============================================================

public class WebsiteBranchBrands
{
    public long WebsiteBranchBrandId { get; set; }
    public long BranchId { get; set; }
    public long BrandManagementId { get; set; }
}


//===============================================================
// A policy page part : warranty / terms / privacy;
// BrandManagementId 0 = general, else that brand's warranty part
//===============================================================

public class WebsitePolicies
{
    public long WebsitePolicyId { get; set; }
    public string PolicyKey { get; set; } = string.Empty;
    public long BrandManagementId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly? UpdatedOn { get; set; }
}


public class WebsitePolicySections
{
    public long WebsitePolicySectionId { get; set; }
    public long WebsitePolicyId { get; set; }
    public string Heading { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}
