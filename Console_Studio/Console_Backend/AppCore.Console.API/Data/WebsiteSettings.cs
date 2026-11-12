//===============================================================
// Website settings (Console : Settings > Website settings)
// --------------------------------------------------------------
// Stored as JSON in SiteSettings (key 'website'); read by the
// public website through api/public/site. The defaults below are
// used until the owner saves the page once.
//===============================================================

using System.Text.Json;

namespace AppCore.Console.API.Data;


public class WebsitePlan
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Tagline { get; set; }
    public decimal? MonthlyPrice { get; set; }      // null : "On request"
    public decimal? SetupFee { get; set; }
    public string? Branches { get; set; }           // "1", "Up to 5", "Unlimited"
    public string? Users { get; set; }
    public bool Highlight { get; set; }
    public List<string> Features { get; set; } = [];
}

public class WebsiteStat
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class WebsiteSettings
{
    public const string Key = "website";

    // company
    public string CompanyName { get; set; } = "AppCore Technologies";
    public string Tagline { get; set; } = "Business software for dealers and growing companies";

    // contact
    public string? Phone { get; set; }
    public string? WhatsApp { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? OfficeHours { get; set; }
    public string? MapUrl { get; set; }
    public string? Facebook { get; set; }
    public string? LinkedIn { get; set; }
    public string? YouTube { get; set; }

    // home page
    public string HeroEyebrow { get; set; } = "AppCore Technologies";
    public string HeroTitle { get; set; } = "Run your whole business from one seat.";
    public string HeroText { get; set; } = "Business software for automobile and two-wheeler dealers, real estate companies and consulting firms : every branch, one system, on your own web address.";
    public bool AnnouncementOn { get; set; }
    public string? AnnouncementText { get; set; }
    public List<WebsiteStat> Stats { get; set; } =
    [
        new() { Value = "Multi-branch", Label = "Every branch in one system" },
        new() { Value = "Tax ready", Label = "Local VAT / sales tax rules built in" },
        new() { Value = "4 industries", Label = "One proven platform" },
        new() { Value = "Your address", Label = "yourname.appcoretech.net" }
    ];

    // requests
    public bool AcceptRequests { get; set; } = true;
    public bool DemoEnabled { get; set; } = true;
    public bool PurchaseEnabled { get; set; } = true;
    public string RequestThanks { get; set; } = "Thank you. Our team will call you within one working day.";

    // pricing
    public bool ShowPricing { get; set; } = true;
    public string Currency { get; set; } = "USD";
    public string? PricingNote { get; set; } = "Prices exclude local taxes. Setup includes data migration and staff training.";
    public List<WebsitePlan> Plans { get; set; } =
    [
        new()
        {
            Code = "STARTER", Name = "Starter", Tagline = "One showroom getting organised",
            Branches = "1", Users = "Up to 5",
            Features = ["Sales and purchase", "Spare parts and accessories", "Registration tracking", "Accounts and tax"]
        },
        new()
        {
            Code = "BUSINESS", Name = "Business", Tagline = "Growing dealers with branches", Highlight = true,
            Branches = "Up to 5", Users = "Up to 25",
            Features = ["Everything in Starter", "Multi-branch stock and transfers", "EMI and bookings", "Customer files and follow-ups", "Team chat"]
        },
        new()
        {
            Code = "ENTERPRISE", Name = "Enterprise", Tagline = "Distributors and large groups",
            Branches = "Unlimited", Users = "Unlimited",
            Features = ["Everything in Business", "Own domain", "Priority support", "Custom reports"]
        }
    ];

    // about
    public string AboutTitle { get; set; } = "Software built inside real businesses";
    public string AboutText { get; set; } = "AppCore Technologies builds business software for automobile and two-wheeler dealers, real estate companies and consulting firms. Our first product grew out of the daily work of a motorcycle dealership, so every screen follows how businesses actually sell, collect and account.\n\nThe same platform now carries four products : AppCore Automobiles, AppCore Two Wheelers, AppCore Real Estate and AppCore Consultancy, each shaped around its own industry.";

    // ---------------------------------------------------------

    public static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = null, WriteIndented = false };

    public static WebsiteSettings Read(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new WebsiteSettings();
        }

        try
        {
            return JsonSerializer.Deserialize<WebsiteSettings>(json, Json) ?? new WebsiteSettings();
        }
        catch (JsonException)
        {
            return new WebsiteSettings();
        }
    }

    public string Write() => JsonSerializer.Serialize(this, Json);
}
