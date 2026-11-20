//===============================================================
// Module gate (2026-11-20)
//===============================================================
//
// A module switched off for a company in the Console is hidden in
// the sidebar and left out of the permissions. This gate makes the
// API refuse it too : a signed-in user of that company can no
// longer SAVE, CHANGE or DELETE anything through the module's
// address (403).
//
// Reading stays allowed on purpose : pages of modules that are on
// look things up in other modules (a purchase reads the VAT setup,
// a user profile reads the designations), and a module that was
// never used holds nothing to read.
//
// The address group is the first part after /api. Most groups
// belong to one module. Sales Operations' addresses also serve the
// Service Operations and Accessories Operations pages (they were
// split out of Sales and kept their API). There the document type
// decides (2026-11-20) : motor bike documents belong to Sales,
// spare parts to Service, accessories to Accessories. Anything
// else under that group is refused only when all three are off.
//
// The gate also tells the rest of the code which modules are off
// for this request (ModuleSwitch, AppCore.Application\Platform\
// Tenancy) : other modules ask it before they offer, use or write
// anything of an off module.
//
// Core modules (Settings, Security & Permission, Accounts &
// Finance, Inventory Management) can never be off in the Console,
// so their groups are not listed.
//
// Program.cs : app.UseModuleGate();   (right after UseTenantTokenCheck)
//
//===============================================================

using AppCore.Application.Platform.Tenancy;

namespace AppCore.Api.Platform.Tenancy;


public static class ModuleGateExtensions
{
    public static IApplicationBuilder UseModuleGate(this IApplicationBuilder app)
        => app.UseMiddleware<ModuleGateMiddleware>();
}


public sealed class ModuleGateMiddleware
{
    // address group -> the modules (route keys) whose pages use it
    // for saving
    private static readonly Dictionary<string, string[]> Owners =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["procurement"] = ["procurement"],
            ["sales-operations"] = ["sales-operations", "service-operations", "accessories-operations"],
            ["service-operations"] = ["service-operations"],
            ["enquiry-management"] = ["enquiry-management"],
            ["registration-management"] = ["registration-management"],
            ["membership-management"] = ["membership-management"],
            ["human-resource-manangement"] = ["human-resource-manangement"],
            ["warranty-management"] = ["warranty-management"],
            ["vat-management"] = ["vat-management"],
            ["fixed-assets-management"] = ["fixed-assets-management"]
        };

    private readonly RequestDelegate _next;

    public ModuleGateMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantLimits limits)
    {
        HttpRequest request = context.Request;

        if (request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase, out PathString rest))
        {
            TenantLimits? tenant =
                await limits.GetAsync(context.RequestAborted);

            HashSet<string> off =
                tenant?.OffModules ?? new HashSet<string>();

            // for every repository and helper of this request
            ModuleSwitch.Set(off);

            if (off.Count > 0 && !IsReading(request))
            {
                string[] parts =
                    (rest.Value ?? string.Empty).Trim('/').ToLowerInvariant().Split('/');

                string[]? owners = OwnersOf(parts);

                if (owners is not null && owners.All(off.Contains))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.Headers.CacheControl = "no-store";

                    await context.Response.WriteAsJsonAsync(
                        new { message = "This module is not part of your package. Contact AppCore to switch it on." });

                    return;
                }
            }
        }

        await _next(context);
    }

    // the modules whose pages save through this address; null =
    // a core address, never refused
    private static string[]? OwnersOf(string[] parts)
    {
        string group = parts[0];

        // pages of a switchable module whose API sits under Settings
        if (group == "settings" && parts.Length > 2
            && parts[1] == "service-settings" && parts[2] == "membership-services")
        {
            return [ModuleKeys.Membership];
        }

        // Employees, departments and designations are used by the
        // whole ERP (Settings > Employee Setup, 2026-11-20) : their
        // addresses stay under Human Resource but always save
        if (group == ModuleKeys.HumanResource && parts.Length > 2
            && ((parts[1] == "human-resource-setup" && parts[2] is "department" or "designation")
                || (parts[1] == "employee-management" && parts[2] == "employees")))
        {
            return null;
        }

        if (group == ModuleKeys.Sales && parts.Length > 1)
        {
            string? type =
                parts[1] switch
                {
                    "motor-bike-sales" => "mb",
                    "spare-parts-lubricant-sales" => "sp",
                    "accessories-sales" => "ac",

                    // .../booking-management/bookings/{type}
                    "booking-management" when parts.Length > 3 => parts[3],

                    // .../business-promotions/promotional-offers-<channel>
                    "business-promotions" when parts.Length > 2 =>
                        parts[2] switch
                        {
                            "promotional-offers-sales-center" => "mb",
                            "promotional-offers-service-center" => "sp",
                            "promotional-offers-accessory-shop" => "ac",
                            _ => null
                        },

                    _ => null
                };

            switch (type)
            {
                case "mb": return [ModuleKeys.Sales];
                case "sp": return [ModuleKeys.Service];
                case "ac": return [ModuleKeys.Accessories];
            }
        }

        return Owners.TryGetValue(group, out string[]? owners) ? owners : null;
    }

    private static bool IsReading(HttpRequest r)
        => HttpMethods.IsGet(r.Method) || HttpMethods.IsHead(r.Method) || HttpMethods.IsOptions(r.Method);
}
