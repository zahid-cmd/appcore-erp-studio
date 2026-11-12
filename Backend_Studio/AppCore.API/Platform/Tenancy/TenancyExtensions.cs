//===============================================================
// Tenancy : registration and middleware
//===============================================================
//
// Program.cs :
//     builder.Services.AddTenancy(builder.Configuration);   (before AddInfrastructure)
//     app.UseTenantResolution();     (right after UseForwardedHeaders)
//     app.UseTenantTokenCheck();     (right after UseAuthentication)
//
// Tenancy:Mode = Off (default) : both middlewares do nothing and
// AppDbContext uses ConnectionStrings:DefaultConnection, as before.
//
// Tenancy:Mode = Host :
//   1. the web address is looked up in AppCore_Control
//      (Infrastructure\Platform\Tenancy\TenantResolver);
//   2. unknown / not active address : a "not active" page (API : JSON
//      404), never another company's data;
//   3. ReadOnly company : only reading (and signing in) is allowed;
//   4. the company goes into ITenantContext, and AppDbContext opens
//      that company's database;
//   5. a login token made for another company is refused (401).
//
//===============================================================

using System.Net;

using AppCore.Application.Platform.Tenancy;
using AppCore.Infrastructure.Platform.Tenancy;

namespace AppCore.Api.Platform.Tenancy;


public static class TenancyExtensions
{
    public static IServiceCollection AddTenancy(this IServiceCollection services, IConfiguration configuration)
    {
        TenancyOptions options =
            configuration.GetSection(TenancyOptions.Section).Get<TenancyOptions>()
            ?? new TenancyOptions();

        // host names and credential keys are not case-sensitive
        options.Credentials =
            new Dictionary<string, TenancyCredential>(options.Credentials, StringComparer.OrdinalIgnoreCase);

        services.AddSingleton(options);
        services.AddSingleton<TenantResolver>();
        services.AddScoped<TenantContext>();
        services.AddScoped<ITenantContext>(sp => sp.GetRequiredService<TenantContext>());
        services.AddSingleton<TenantScopes>();

        return services;
    }

    public static IApplicationBuilder UseTenantResolution(this IApplicationBuilder app)
        => app.UseMiddleware<TenantResolutionMiddleware>();

    public static IApplicationBuilder UseTenantTokenCheck(this IApplicationBuilder app)
        => app.UseMiddleware<TenantTokenCheckMiddleware>();

    public static IApplicationBuilder UseTenantUploads(this IApplicationBuilder app)
        => app.UseMiddleware<TenantUploadsMiddleware>();
}


//===============================================================
// Uploaded files : one folder per company
//===============================================================
//
// Mode Off  : wwwroot\uploads\...                 (as always)
// Mode Host : wwwroot\tenants\<CODE>\uploads\...
//
// Every controller that saves / deletes an upload asks
//     TenantWebRoot.Of(HttpContext, _environment)
// instead of _environment.WebRootPath, then adds "uploads\..." as
// before. Addresses stay /uploads/... : TenantUploadsMiddleware
// maps them to the company's folder, and /tenants/... can never be
// opened directly (no company sees another's pictures).
//
//===============================================================

public static class TenantWebRoot
{
    public const string TenantsFolder = "tenants";

    public static string Base(IWebHostEnvironment environment)
        => string.IsNullOrWhiteSpace(environment.WebRootPath)
            ? Path.Combine(environment.ContentRootPath, "wwwroot")
            : environment.WebRootPath;

    // the web root this request's uploads live under
    public static string Of(HttpContext? context, IWebHostEnvironment environment)
    {
        string root = Base(environment);

        TenantInfo? tenant = context?.RequestServices.GetService<ITenantContext>()?.Tenant;

        return tenant is null ? root : ForCompany(root, tenant.TenantCode);
    }

    public static string ForCompany(string baseRoot, string tenantCode)
        => Path.Combine(baseRoot, TenantsFolder, tenantCode);
}

public sealed class TenantUploadsMiddleware
{
    private readonly RequestDelegate _next;

    public TenantUploadsMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenant)
    {
        if (tenant.Enabled)
        {
            PathString path = context.Request.Path;

            // the folders of all companies : never served directly
            if (path.StartsWithSegments("/" + TenantWebRoot.TenantsFolder))
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            if (tenant.Tenant is TenantInfo info && path.StartsWithSegments("/uploads"))
            {
                context.Request.Path = new PathString("/" + TenantWebRoot.TenantsFolder + "/" + info.TenantCode).Add(path);
            }
        }

        await _next(context);
    }
}


//===============================================================
// 1. Which company is this request for?
//===============================================================

public sealed class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly TenancyOptions _options;
    private readonly TenantResolver _resolver;
    private readonly ILogger<TenantResolutionMiddleware> _log;

    public TenantResolutionMiddleware(
        RequestDelegate next,
        TenancyOptions options,
        TenantResolver resolver,
        ILogger<TenantResolutionMiddleware> log)
    {
        _next = next;
        _options = options;
        _resolver = resolver;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenant)
    {
        if (!_options.IsHostMode)
        {
            await _next(context);
            return;
        }

        string host = context.Request.Host.Host;

        TenantLookup lookup;

        try
        {
            lookup = IsLocal(host) && !string.IsNullOrWhiteSpace(_options.LocalHostTenant)
                ? await ResolveLocalAsync(context.RequestAborted)
                : await _resolver.ResolveAsync(host, context.RequestAborted);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Tenancy : could not read AppCore_Control for {Host}", host);

            await Refuse(context, HttpStatusCode.ServiceUnavailable, "The service is starting or under maintenance. Please try again in a minute.");
            return;
        }

        if (lookup.Tenant is not TenantInfo info)
        {
            _log.LogInformation("Tenancy : {Host} refused : {Problem}", host, lookup.Problem);

            await Refuse(context, HttpStatusCode.NotFound, "This address is not active. Please check the address, or contact AppCore Technologies.");
            return;
        }

        if (info.IsReadOnly && !IsReading(context.Request))
        {
            await Refuse(context, HttpStatusCode.Locked, "This company is read-only : you can look, but not change anything. Please contact AppCore Technologies.");
            return;
        }

        tenant.Set(info);

        await _next(context);
    }

    // http://localhost (Deploy Agent health checks, the server
    // itself) : the company named in Tenancy:LocalHostTenant
    private Task<TenantLookup> ResolveLocalAsync(CancellationToken ct)
        => _resolver.ResolveByCodeAsync(_options.LocalHostTenant!, ct);

    private static bool IsLocal(string host)
        => host is "localhost" or "127.0.0.1" or "::1" or "[::1]";

    private static bool IsReading(HttpRequest r)
        => HttpMethods.IsGet(r.Method) || HttpMethods.IsHead(r.Method) || HttpMethods.IsOptions(r.Method)
           || r.Path.StartsWithSegments("/api/authentication");

    private static async Task Refuse(HttpContext context, HttpStatusCode code, string message)
    {
        context.Response.StatusCode = (int)code;
        context.Response.Headers.CacheControl = "no-store";

        if (context.Request.Path.StartsWithSegments("/api") || context.Request.Path.StartsWithSegments("/hubs"))
        {
            await context.Response.WriteAsJsonAsync(new { message });
            return;
        }

        context.Response.ContentType = "text/html; charset=utf-8";

        await context.Response.WriteAsync(
            $$"""
            <!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>AppCore</title><style>
            body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111317;color:#e9e8e4;font-family:system-ui,Segoe UI,Arial,sans-serif}
            .b{max-width:460px;padding:36px;border:1px solid rgba(255,255,255,.1);border-radius:20px;background:#1b1e24;text-align:center}
            h1{margin:0 0 10px;font-size:22px}p{margin:0 0 22px;color:#a7aab2;line-height:1.6}
            a{display:inline-block;padding:11px 20px;border-radius:12px;background:linear-gradient(135deg,#d8834a,#b4551f 55%,#7a3410);color:#fff;font-weight:700;text-decoration:none}
            </style></head><body><div class="b"><h1>AppCore</h1><p>{{WebUtility.HtmlEncode(message)}}</p><a href="https://appcoretech.net">AppCore Technologies</a></div></body></html>
            """);
    }
}


//===============================================================
// 2. A login token belongs to one company only
//===============================================================

public sealed class TenantTokenCheckMiddleware
{
    private readonly RequestDelegate _next;

    public TenantTokenCheckMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenant)
    {
        if (tenant.Enabled && tenant.Tenant is TenantInfo info && context.User.Identity?.IsAuthenticated == true)
        {
            string? claim = context.User.FindFirst(TenantClaims.Tenant)?.Value;

            if (!string.Equals(claim, info.TenantCode, StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "Please sign in again." });
                return;
            }
        }

        await _next(context);
    }
}
