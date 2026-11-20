//===============================================================
// Module switch (2026-11-20)
//===============================================================
//
// Blueprint : claude\blueprint-module-isolation.md
//
// A module switched off for a company in the Console disappears
// from the OTHER modules too : its fields are not offered, its
// amounts are not calculated or posted, no record is written to
// its tables. Code anywhere asks :
//
//     if (ModuleSwitch.IsOff(ModuleKeys.Warranty)) { ... skip ... }
//
// The answer belongs to the running request : the module gate
// (AppCore.API\Platform\Tenancy\ModuleGate.cs) sets it for every
// API request from the company's limits. It travels with the
// request (AsyncLocal), so static helpers and base classes can ask
// without a new constructor parameter.
//
// Outside a request (a background job) nothing is set : every
// module counts as ON. A job that works company by company sets
// it itself with ModuleSwitch.Set(...).
//
// Rules (the same in every module) :
//   - OFF : nothing NEW of that module is offered, used or written.
//   - Documents saved before keep their figures; cancel, return
//     and print of an old document keep working.
//
//===============================================================

namespace AppCore.Application.Platform.Tenancy;


// The switchable modules' route keys (NavigationModules.RouteKey,
// as the Console saves them). Core modules are never off.
public static class ModuleKeys
{
    public const string Procurement = "procurement";

    public const string Sales = "sales-operations";

    public const string Service = "service-operations";

    public const string Accessories = "accessories-operations";

    public const string Enquiry = "enquiry-management";

    public const string Registration = "registration-management";

    public const string Membership = "membership-management";

    // (spelled as the route key is)
    public const string HumanResource = "human-resource-manangement";

    public const string Warranty = "warranty-management";

    public const string Vat = "vat-management";

    public const string FixedAssets = "fixed-assets-management";

    public const string Emi = "emi-management";
}


public static class ModuleSwitch
{
    private static readonly AsyncLocal<HashSet<string>?> Current = new();

    // the off modules of the company now being served (null or
    // empty = everything on)
    public static void Set(HashSet<string>? offModules)
    {
        Current.Value =
            offModules is { Count: > 0 }
                ? new HashSet<string>(offModules, StringComparer.OrdinalIgnoreCase)
                : null;
    }

    public static bool IsOff(string routeKey) =>
        Current.Value is { } off && off.Contains(routeKey);

    public static bool IsOn(string routeKey) => !IsOff(routeKey);

    public static List<string> OffModules =>
        Current.Value is { } off
            ? off.OrderBy(x => x).ToList()
            : new List<string>();

    // A page that sits in the menu of ONE module but only shows
    // the data of ANOTHER : page route key -> the module it needs.
    // The sidebar leaves it out while that module is off.
    private static readonly Dictionary<string, string> PageNeeds =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // Service Operations > Service Reports : the bikes whose
            // next service falls due come from Enquiry Management
            ["service-due-list"] = ModuleKeys.Enquiry
        };

    // the page route keys (lower case) hidden for these off modules
    public static List<string> OffPages(IEnumerable<string> offModules)
    {
        HashSet<string> off =
            new(offModules, StringComparer.OrdinalIgnoreCase);

        return PageNeeds
            .Where(x => off.Contains(x.Value))
            .Select(x => x.Key.ToLowerInvariant())
            .ToList();
    }
}
