//===============================================================
// Namespaces
//===============================================================

using System.Collections.Concurrent;

using AppCore.Application.Platform.Authentication.DTOs;
using AppCore.Application.Platform.Authentication.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Platform.WorkBranch;


//===============================================================
// Working Branch Middleware (owner 2026-11-13 03:28)
//
// A user assigned to several branches works in the branch that
// runs the page's business line : on a Motor Bikes page the
// showroom, on a Spare Parts page the service center, on an
// Accessories page the accessory shop (one picked in the top bar
// when there are several). The page sends it in X-Work-Branch.
//
// Here : when the header names a branch other than the login
// branch, the user must be assigned to it (Branch Assignment :
// the login rule, the same list as Switch Branch) and branch
// switching must be ON (Security & Permission > Branch
// Assignment setting). Then this.CurrentBranchId() answers that
// branch for the request (CurrentUserExtensions). Otherwise 403.
//
// The pages' own servers still check the business line (a Motor
// Bikes page refuses a branch that does not run Motor Bikes).
//
// api/platform/* is left alone : those calls (my-branches,
// branch switch, shell) always mean the login branch.
//===============================================================

public sealed class WorkBranchMiddleware
{
    private readonly RequestDelegate _next;

    // (company host | user | login branch) -> branches, 30 s
    private static readonly ConcurrentDictionary<string, (DateTime At, MyBranchesDto Branches)> Cache = new();

    private static readonly TimeSpan CacheFor = TimeSpan.FromSeconds(30);

    public WorkBranchMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext http, IAuthenticationService authenticationService)
    {
        if (!http.Request.Headers.TryGetValue(CurrentUserExtensions.WorkBranchHeader, out var values) ||
            !http.User.IsLoggedIn() ||
            http.Request.Path.StartsWithSegments("/api/platform", StringComparison.OrdinalIgnoreCase))
        {
            await _next(http);

            return;
        }

        if (!long.TryParse(values.ToString().Trim(), out long branchId) || branchId <= 0)
        {
            await _next(http);

            return;
        }

        long loginBranchId = http.User.GetBranchId() ?? 0;

        // The login branch : nothing to check
        if (branchId == loginBranchId)
        {
            http.Items[CurrentUserExtensions.WorkBranchItemKey] = branchId;

            await _next(http);

            return;
        }

        long userId = http.User.GetUserId();

        string key = $"{http.Request.Host.Value}|{userId}|{loginBranchId}";

        MyBranchesDto mine;

        if (Cache.TryGetValue(key, out var hit) && DateTime.UtcNow - hit.At < CacheFor)
        {
            mine = hit.Branches;
        }
        else
        {
            mine = await authenticationService.GetMyBranchesAsync(userId, loginBranchId);

            Cache[key] = (DateTime.UtcNow, mine);
        }

        if (!mine.SwitchAllowed || !mine.Branches.Any(b => b.BranchId == branchId))
        {
            http.Response.StatusCode = StatusCodes.Status403Forbidden;

            await http.Response.WriteAsJsonAsync(
                new
                {
                    success = false,
                    message = mine.SwitchAllowed
                        ? "You are not assigned to that branch any more (Security & Permission > Branch Assignment). Reload the page : it goes back to one of your branches."
                        : "Working in another branch is off (Security & Permission > Branch Assignment setting). Reload the page : it works in your login branch."
                });

            return;
        }

        http.Items[CurrentUserExtensions.WorkBranchItemKey] = branchId;

        await _next(http);
    }
}


public static class WorkBranchExtensions
{
    // After UseAuthentication / UseAuthorization (needs the user)
    public static IApplicationBuilder UseWorkBranch(this IApplicationBuilder app)
    {
        return app.UseMiddleware<WorkBranchMiddleware>();
    }
}
