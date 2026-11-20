//===============================================================
// Tenancy : which client company this request belongs to
//===============================================================
//
// One AppCoreERP service can serve many client companies, each
// with its own database. The web address decides the company :
//
//     motozone.appcoretech.net  ->  AppCore_Control  ->  its database
//
// Switch "Tenancy:Mode" (appsettings) :
//     Off  : (default) one company, ConnectionStrings:DefaultConnection.
//            Enabled = false, Tenant = null. Nothing changes.
//     Host : the company is looked up from the web address for every
//            request (AppCore.API\Platform\Tenancy).
//
// Read it anywhere with ITenantContext (scoped).
//
//===============================================================

namespace AppCore.Application.Platform.Tenancy;


public interface ITenantContext
{
    // Tenancy:Mode = Host
    bool Enabled { get; }

    // the company of this request; null when Enabled = false
    // (or outside a request, e.g. a background job)
    TenantInfo? Tenant { get; }
}


//===============================================================
// One client company (a tenant in AppCore_Control)
//===============================================================

public sealed record TenantInfo(
    string TenantCode,
    string DisplayName,
    string Status,
    string HostName,
    string DatabaseName,
    string ConnectionString,

    // Limits set in the Console (Tenants.MaxCompanies / MaxBranches) :
    // the client makes his own company and branches up to these
    // numbers. MaxBranches null = no limit.
    int MaxCompanies = 1,
    int? MaxBranches = null,

    // Console (10_Modules_Packages_Users.sql, 2026-11-20) : users
    // allowed (null = no limit) and the modules switched OFF
    // (module route keys, comma separated; '' = everything on)
    int? MaxUsers = null,

    string DisabledModules = "")
{
    // Console status ReadOnly : the company can look, not change
    public bool IsReadOnly =>
        string.Equals(Status, "ReadOnly", StringComparison.OrdinalIgnoreCase);
}


//===============================================================
// Claim name of the company inside the login token
//===============================================================

public static class TenantClaims
{
    public const string Tenant = "tenant";
}
