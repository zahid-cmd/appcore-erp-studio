//===============================================================
// Global Using
//===============================================================
//
// Makes these helpers available in every file of AppCore.API,
// so the controllers need no extra using line.
//
//===============================================================

global using AppCore.Api.Extensions;


//===============================================================
// Namespaces
//===============================================================

using System.Security.Claims;

using Microsoft.AspNetCore.Mvc;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Extensions;


//===============================================================
// Current User Extensions
//===============================================================
//
// Reads the logged-in user from the login token (JWT).
//
// Claims written by AuthenticationService.GenerateToken :
//
//     sub          → UserProfileId
//     unique_name  → UserName (Login ID)
//     displayName  → DisplayName
//     branchId     → Branch selected at login
//
// ASP.NET may rename "sub" to ClaimTypes.NameIdentifier and
// "unique_name" to ClaimTypes.Name when it reads the token, so
// both forms are checked.
//
// Usage inside a controller :
//
//     long   userId   = this.CurrentUserId();
//     string userName = this.CurrentUserName();
//     long?  branchId = this.CurrentBranchId();
//
//===============================================================

public static class CurrentUserExtensions
{
    //===========================================================
    // Fallbacks (no token / background job)
    //===========================================================

    public const long SystemUserId =
        1;

    public const string SystemUserName =
        "System";


    //===========================================================
    // Claim Names
    //===========================================================

    private const string SubClaim =
        "sub";

    private const string UniqueNameClaim =
        "unique_name";

    private const string DisplayNameClaim =
        "displayName";

    private const string BranchIdClaim =
        "branchId";


    //===========================================================
    // ClaimsPrincipal : Is Authenticated
    //===========================================================

    public static bool IsLoggedIn(
        this ClaimsPrincipal? user)
    {
        return user?.Identity?.IsAuthenticated == true;
    }


    //===========================================================
    // ClaimsPrincipal : User Id
    //===========================================================

    public static long GetUserId(
        this ClaimsPrincipal? user)
    {
        if (!user.IsLoggedIn())
        {
            return SystemUserId;
        }

        string? value =
            FirstValue(
                user!,
                ClaimTypes.NameIdentifier,
                SubClaim);

        return long.TryParse(value, out long userId) &&
               userId > 0
            ? userId
            : SystemUserId;
    }


    //===========================================================
    // ClaimsPrincipal : Login ID
    //===========================================================

    public static string GetLoginId(
        this ClaimsPrincipal? user)
    {
        if (!user.IsLoggedIn())
        {
            return string.Empty;
        }

        return FirstValue(
                   user!,
                   ClaimTypes.Name,
                   UniqueNameClaim)
               ?? string.Empty;
    }


    //===========================================================
    // ClaimsPrincipal : Display Name
    //===========================================================

    public static string GetDisplayName(
        this ClaimsPrincipal? user)
    {
        if (!user.IsLoggedIn())
        {
            return string.Empty;
        }

        return FirstValue(
                   user!,
                   DisplayNameClaim)
               ?? string.Empty;
    }


    //===========================================================
    // ClaimsPrincipal : Name for activity history
    //
    //     Display Name → Login ID → "System"
    //===========================================================

    public static string GetPerformedByName(
        this ClaimsPrincipal? user)
    {
        string displayName =
            user.GetDisplayName();

        if (!string.IsNullOrWhiteSpace(displayName))
        {
            return displayName;
        }

        string loginId =
            user.GetLoginId();

        return string.IsNullOrWhiteSpace(loginId)
            ? SystemUserName
            : loginId;
    }


    //===========================================================
    // ClaimsPrincipal : Branch Id
    //===========================================================

    public static long? GetBranchId(
        this ClaimsPrincipal? user)
    {
        if (!user.IsLoggedIn())
        {
            return null;
        }

        string? value =
            FirstValue(
                user!,
                BranchIdClaim);

        return long.TryParse(value, out long branchId) &&
               branchId > 0
            ? branchId
            : null;
    }


    //===========================================================
    // Controller : User Id
    //===========================================================

    public static long CurrentUserId(
        this ControllerBase controller)
    {
        return controller.User.GetUserId();
    }


    //===========================================================
    // Controller : Name for activity history
    //===========================================================

    public static string CurrentUserName(
        this ControllerBase controller)
    {
        return controller.User.GetPerformedByName();
    }


    //===========================================================
    // Controller : Branch Id
    //===========================================================

    public static long? CurrentBranchId(
        this ControllerBase controller)
    {
        return controller.User.GetBranchId();
    }


    //===========================================================
    // First non-empty value among the claim names
    //===========================================================

    private static string? FirstValue(
        ClaimsPrincipal user,
        params string[] claimTypes)
    {
        foreach (string claimType in claimTypes)
        {
            string? value =
                user.FindFirst(claimType)?.Value;

            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }
}