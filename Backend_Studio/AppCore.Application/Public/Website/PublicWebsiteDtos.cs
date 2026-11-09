//===============================================================
// Public Website : DTOs
//---------------------------------------------------------------
// What the company's public website may see. Display data only :
// no ids, costs, stock counts, suppliers, customers or legal
// numbers (BIN / TIN / trade licence).
//===============================================================

namespace AppCore.Application.Public.Website;


public class PublicWebsiteDto
{
    public PublicCompanyDto Company { get; set; } = new();

    public List<PublicBranchDto> Branches { get; set; } = new();

    public List<PublicBikeModelDto> Models { get; set; } = new();

    // Brands with at least one active product category
    public List<PublicBrandDto> Brands { get; set; } = new();

    // Website Configuration page; null = never saved (the
    // website then keeps reading its JSON file)
    public PublicWebsiteConfigDto? Configuration { get; set; }
}


//===============================================================
// The Website Configuration page, public parts only
//===============================================================

public class PublicWebsiteConfigDto
{
    public bool IsEnabled { get; set; }
    public string DefaultTheme { get; set; } = "auto";
    public string CurrencySymbol { get; set; } = "৳";

    // Offer ribbon; OfferEndsOn "yyyy-MM-dd" or empty
    public string OfferTitle { get; set; } = string.Empty;
    public string OfferText { get; set; } = string.Empty;
    public string OfferEndsOn { get; set; } = string.Empty;

    public string Tagline { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;

    // Empty = the Company page's values (already in Company)
    public string Hotline { get; set; } = string.Empty;
    public string WhatsApp { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string MapQuery { get; set; } = string.Empty;

    public string FacebookUrl { get; set; } = string.Empty;
    public string YoutubeUrl { get; set; } = string.Empty;
    public string InstagramUrl { get; set; } = string.Empty;
    public string TiktokUrl { get; set; } = string.Empty;

    public bool ShowBrandsMenu { get; set; }
    public bool ShowOfferRibbon { get; set; }
    public bool ShowMovingStrip { get; set; }
    public int StripSpeed { get; set; } = 5;
    public bool ShowWhyUs { get; set; }
    public bool ShowEmi { get; set; }
    public bool ShowService { get; set; }
    public bool ShowBranches { get; set; }
    public bool ShowFaq { get; set; }

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


    public decimal EmiExamplePrice { get; set; }
    public List<int> EmiDownPercents { get; set; } = new();
    public List<int> EmiMonths { get; set; } = new();
    public string EmiNote { get; set; } = string.Empty;

    public List<PublicHourDto> OpeningHours { get; set; } = new();

    // Kind : tag · why-point · why-stat · service · faq ·
    // payment · text (Title = key, Text = wording)
    public List<PublicItemDto> Items { get; set; } = new();

    // In display order
    public List<PublicBrandSettingDto> Brands { get; set; } = new();

    public List<PublicBranchBrandsDto> BranchBrands { get; set; } = new();

    public List<PublicPolicyDto> Policies { get; set; } = new();
}


public class PublicHourDto
{
    public string Days { get; set; } = string.Empty;
    public string OpensAt { get; set; } = string.Empty;
    public string ClosesAt { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
}


public class PublicItemDto
{
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string PhotoPath { get; set; } = string.Empty;
}


public class PublicBrandSettingDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool ShowOnWebsite { get; set; }
    public bool ShowBrandPage { get; set; }
    public string About { get; set; } = string.Empty;
}


public class PublicBranchBrandsDto
{
    public string Branch { get; set; } = string.Empty;
    public List<string> Brands { get; set; } = new();
}


public class PublicPolicyDto
{
    // warranty · terms · privacy
    public string Key { get; set; } = string.Empty;
    // Empty = general part
    public string Brand { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string UpdatedOn { get; set; } = string.Empty;
    public List<PublicPolicySectionDto> Sections { get; set; } = new();
}


public class PublicPolicySectionDto
{
    public string Heading { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}


public class PublicBrandDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string LogoPath { get; set; } = string.Empty;
}


// One spare part, lubricant or accessory in a brand's catalogue
public class PublicPartDto
{
    // Spare Parts / Lubricants / Accessories
    public string Kind { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Newest MRP; null = no price yet
    public decimal? Price { get; set; }

    // in-stock / order
    public string Stock { get; set; } = string.Empty;
}


public class PublicCompanyDto
{
    public string Name { get; set; } = string.Empty;

    public string ShortName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Website { get; set; } = string.Empty;

    // "/uploads/company-logos/…" (empty = no logo)
    public string LogoPath { get; set; } = string.Empty;
}


public class PublicBranchDto
{
    public string Name { get; set; } = string.Empty;

    public string ShortName { get; set; } = string.Empty;

    // The wing : Sales Center / Service Center / Accessory Shop
    public string Type { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string Mobile { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;
}


// One bike model (Product Sub Category of a Motor Bikes category)
public class PublicBikeModelDto
{
    public string ModelCode { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string Brand { get; set; } = string.Empty;

    public string BrandCode { get; set; } = string.Empty;

    public string BrandLogoPath { get; set; } = string.Empty;

    // Lowest colour MRP; null = no price yet
    public decimal? Price { get; set; }

    // in-stock / few-left / pre-order (best of its colours)
    public string Stock { get; set; } = string.Empty;

    public List<PublicBikeColourDto> Colours { get; set; } = new();

    // From Bike Models (Website Configuration › Bikes). Null when
    // the model is not linked to a Bike Model : the website then
    // keeps its own texts.
    public bool? ShowOnWebsite { get; set; }

    public bool? Featured { get; set; }

    public string Tagline { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int? DisplayOrder { get; set; }

    // From Motor Bike Specifications. ShowSpecs null = no record
    // (the website keeps its own sheet); false = hide the sheet.
    public bool? ShowSpecs { get; set; }

    // Short engine / motor line, e.g. "1200 W" or "125 cc"
    public string Engine { get; set; } = string.Empty;

    // e.g. "80 km per charge" / "60 km/h"; empty = not given
    public string Mileage { get; set; } = string.Empty;

    public string TopSpeed { get; set; } = string.Empty;

    public List<PublicSpecGroupDto> Specs { get; set; } = new();
}


// One block of the specification sheet
public class PublicSpecGroupDto
{
    public string Title { get; set; } = string.Empty;

    public List<PublicSpecRowDto> Rows { get; set; } = new();
}


public class PublicSpecRowDto
{
    public string Label { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;
}


// One colour of the model (one Motor Bike record)
public class PublicBikeColourDto
{
    public string ProductCode { get; set; } = string.Empty;

    public string Colour { get; set; } = string.Empty;

    public string ImagePath { get; set; } = string.Empty;

    public decimal? Price { get; set; }

    public string Stock { get; set; } = string.Empty;
}
