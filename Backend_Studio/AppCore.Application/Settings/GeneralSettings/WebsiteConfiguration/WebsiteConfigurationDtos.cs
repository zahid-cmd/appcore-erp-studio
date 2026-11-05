//===============================================================
// Website Configuration : DTOs
//
// One shape for reading (GET) and saving (PUT). On save the
// server ignores the read-only parts : Company, the brand and
// branch names, BikeModels, Exists, ModifiedDate.
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.WebsiteConfiguration.DTOs;


public class WebsiteConfigurationDto
{
    // false = nothing saved yet (the website still reads its JSON)
    public bool Exists { get; set; }

    // General
    public bool IsEnabled { get; set; } = true;
    public string DefaultTheme { get; set; } = "auto";
    public string Template { get; set; } = "website-page-1";
    public string CurrencySymbol { get; set; } = "৳";
    public string Tagline { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;

    // Contact (empty = from the Company page)
    public string Hotline { get; set; } = string.Empty;
    public string WhatsApp { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string MapQuery { get; set; } = string.Empty;
    // Link pasted from Google Maps; MapQuery is read from it on save
    public string MapLink { get; set; } = string.Empty;

    // Social
    public string FacebookUrl { get; set; } = string.Empty;
    public string YoutubeUrl { get; set; } = string.Empty;
    public string InstagramUrl { get; set; } = string.Empty;
    public string TiktokUrl { get; set; } = string.Empty;

    // Home page sections
    public bool ShowBrandsMenu { get; set; } = true;
    public bool ShowOfferRibbon { get; set; } = true;
    public bool ShowMovingStrip { get; set; } = true;
    // Moving strip speed : 1 slowest … 10 fastest
    public int StripSpeed { get; set; } = 5;
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

    // EMI
    public decimal EmiExamplePrice { get; set; }
    public List<int> EmiDownPercents { get; set; } = new() { 10, 20, 30, 50 };
    public List<int> EmiMonths { get; set; } = new() { 3, 6, 12, 18, 24 };
    public string EmiNote { get; set; } = string.Empty;

    // Lists
    public List<WebsiteHourDto> OpeningHours { get; set; } = new();
    public List<WebsiteItemDto> Items { get; set; } = new();
    public List<WebsiteBrandDto> Brands { get; set; } = new();
    public List<WebsiteBranchDto> Branches { get; set; } = new();
    public List<WebsitePolicyDto> Policies { get; set; } = new();

    // Read-only
    public WebsiteCompanyInfoDto Company { get; set; } = new();
    public DateTime? ModifiedDate { get; set; }
}


public class WebsiteHourDto
{
    public string Days { get; set; } = string.Empty;
    // "HH:mm" (24 h); empty when closed
    public string OpensAt { get; set; } = string.Empty;
    public string ClosesAt { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
}


public class WebsiteItemDto
{
    // tag · why-point · why-stat · service · faq · payment · text
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string PhotoPath { get; set; } = string.Empty;
}


// In display order
public class WebsiteBrandDto
{
    public long BrandManagementId { get; set; }
    public string BrandCode { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string LogoPath { get; set; } = string.Empty;
    // Active bike models of the brand (read-only)
    public int BikeModels { get; set; }
    public bool ShowOnWebsite { get; set; } = true;
    public bool ShowBrandPage { get; set; } = true;
    public string About { get; set; } = string.Empty;
}


public class WebsiteBranchDto
{
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string WingName { get; set; } = string.Empty;
    // Brands this branch sells
    public List<long> BrandIds { get; set; } = new();
}


public class WebsitePolicyDto
{
    // warranty · terms · privacy
    public string PolicyKey { get; set; } = string.Empty;
    // 0 = general part; else a brand's warranty part
    public long BrandManagementId { get; set; }
    public string BrandName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly? UpdatedOn { get; set; }
    public List<WebsitePolicySectionDto> Sections { get; set; } = new();
}


public class WebsitePolicySectionDto
{
    public string Heading { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}


// From Settings › Company, shown read-only on the page
public class WebsiteCompanyInfoDto
{
    public string Name { get; set; } = string.Empty;
    public string LogoPath { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
}


// A pin read from a Google Maps link (POST map-pin)
public class WebsiteMapPinDto
{
    public string Link { get; set; } = string.Empty;
    // "lat,lng" when the link has coordinates, else the place name
    public string Query { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
