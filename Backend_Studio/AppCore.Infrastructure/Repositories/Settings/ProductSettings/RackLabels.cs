//===============================================================
// Namespaces
//===============================================================

using System.Text.RegularExpressions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Rack Labels : the one place that builds rack / shelf / bin
// texts on the server (same format as the frontend's
// shared/inventory/storage-labels.ts). Plain ASCII only (the
// database is WIN1252).
//
//   Rack letter   : "Rack A"  -> "A"
//   Shelf label   : SLF-A-03
//   Bin code      : A-03-05   (rack - shelf - bin)
//   Bin label     : BIN-A-03-05
//   Location text : Rack A / SLF-A-03 / Bin 05
//===============================================================

public static class RackLabels
{
    private static readonly Regex RackPrefix =
        new(@"^rack\s+(.+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string Letter
    (
        string? rackName
    )
    {
        string name =
            (rackName ?? string.Empty).Trim();

        Match match =
            RackPrefix.Match(name);

        return (match.Success ? match.Groups[1].Value : name).Trim();
    }

    private static string Two
    (
        int value
    ) =>
        Math.Max(0, value).ToString("00", System.Globalization.CultureInfo.InvariantCulture);

    public static string Shelf
    (
        string? rackName,
        int shelfNumber
    )
    {
        string letter =
            Letter(rackName);

        return letter.Length > 0 && shelfNumber > 0
            ? $"SLF-{letter}-{Two(shelfNumber)}"
            : string.Empty;
    }

    public static string BinCode
    (
        string? rackName,
        int shelfNumber,
        int binNumber
    )
    {
        string letter =
            Letter(rackName);

        return letter.Length > 0 && shelfNumber > 0
            ? $"{letter}-{Two(shelfNumber)}-{Two(binNumber > 0 ? binNumber : 1)}"
            : string.Empty;
    }

    public static string BinLabel
    (
        string? rackName,
        int shelfNumber,
        int binNumber
    )
    {
        string code =
            BinCode(rackName, shelfNumber, binNumber);

        return code.Length > 0 ? $"BIN-{code}" : string.Empty;
    }

    public static string Location
    (
        string? rackName,
        int shelfNumber,
        int binNumber
    )
    {
        string rack =
            (rackName ?? string.Empty).Trim();

        return rack.Length > 0 && shelfNumber > 0
            ? $"{rack} / {Shelf(rack, shelfNumber)} / Bin {Two(binNumber > 0 ? binNumber : 1)}"
            : string.Empty;
    }


    //===========================================================
    // Movement classes (Spare Parts and Accessories)
    //===========================================================

    public const string SuperFast = "SuperFast";
    public const string Fast = "Fast";
    public const string Regular = "Regular";
    public const string Periodic = "Periodic";
    public const string Slow = "Slow";

    public static readonly IReadOnlyList<string> MovementClasses =
        new[] { SuperFast, Fast, Regular, Periodic, Slow };

    // Unknown / empty -> Slow (the default)
    public static string NormalizeMovementClass
    (
        string? value
    )
    {
        string key =
            (value ?? string.Empty).Replace(" ", string.Empty).Replace("-", string.Empty).Replace("_", string.Empty);

        return MovementClasses.FirstOrDefault(x => string.Equals(x, key, StringComparison.OrdinalIgnoreCase))
            ?? Slow;
    }

    // Display label : "Super Fast Moving" … "Slow Moving"
    // (history texts; the frontend has its own constant list)
    public static string MovementLabel
    (
        string? value
    ) =>
        NormalizeMovementClass(value) switch
        {
            SuperFast => "Super Fast Moving",
            Fast => "Fast Moving",
            Regular => "Regular Moving",
            Periodic => "Periodic Moving",
            _ => "Slow Moving"
        };

    // 1 = fastest (allocation order)
    public static int MovementRank
    (
        string? value
    ) =>
        NormalizeMovementClass(value) switch
        {
            SuperFast => 1,
            Fast => 2,
            Regular => 3,
            Periodic => 4,
            _ => 5
        };
}
