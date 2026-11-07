//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Accessory Uses (Accessories products)
//
//   For Sale                 : sold in the accessories shop (default)
//   Additional Accessories   : free with every bike, all year round
//                              (supplier items, zero cost)
//   Promotional Accessories  : free with bikes during a promotion
//
// Every use keeps its groups, sub groups and ledgers : leftover
// free stock may be sold later at a price set on Product Pricing.
//===============================================================

public static class AccessoryUses
{
    public const string ForSale = "For Sale";

    public const string Additional = "Additional Accessories";

    public const string Promotional = "Promotional Accessories";

    public static readonly string[] All =
    {
        ForSale,
        Additional,
        Promotional
    };

    // Free with bikes (shown on Motor Bike Stock › Accessories)
    public static bool IsBikeAccessory(string? use) =>
        Normalize(use) != ForSale;

    // "additional" / "Additional Accessories" → Additional
    // Accessories; empty → For Sale; unknown → error
    public static string Normalize
    (
        string? use
    )
    {
        string text =
            (use ?? string.Empty).Trim();

        if (text.Length == 0)
        {
            return ForSale;
        }

        string? found =
            All.FirstOrDefault(x => x.Equals(text, StringComparison.OrdinalIgnoreCase))
            ??
            All.FirstOrDefault(x => x.StartsWith(text, StringComparison.OrdinalIgnoreCase));

        return found
            ?? throw new InvalidOperationException(
                $"Unknown accessory use \"{use}\" : choose For Sale, Additional Accessories or Promotional Accessories.");
    }
}
