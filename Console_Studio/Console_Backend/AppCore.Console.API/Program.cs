//===============================================================
// AppCore Console API
// --------------------------------------------------------------
// AppCore's back office : products (industries), customers,
// tenants (one per customer + product, own database), staff.
// Database : AppCore_Control (Console_Studio\Database\*.sql).
// Dev : http://localhost:5300  (Console UI : http://localhost:4300)
//===============================================================

using System.Text;
using System.Threading.RateLimiting;

using Microsoft.Extensions.FileProviders;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using AppCore.Console.API.Controllers;
using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// On skyhost it runs as the Windows service "AppCoreConsole"
// (install-console.cmd); from cmd / VS Code it runs as before.
builder.Host.UseWindowsService();

string connection =
    builder.Configuration.GetConnectionString("Control")
    ?? throw new InvalidOperationException("ConnectionStrings:Control is missing (appsettings.json).");

string jwtKey =
    builder.Configuration["Jwt:Key"] ?? string.Empty;

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 characters (appsettings.json).");
}

builder.Services.AddDbContext<ControlDbContext>(options => options.UseNpgsql(connection));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<Audit>();
builder.Services.AddSingleton<StaffTokens>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    // the Console UI
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
              .AllowAnyHeader()
              .AllowAnyMethod());

    // the public website : only api/public (Cors:SiteOrigins, else these)
    options.AddPolicy(SitePolicy.Cors, policy =>
        policy.WithOrigins(
                  builder.Configuration.GetSection("Cors:SiteOrigins").Get<string[]>()
                  ?? ["http://localhost:4400", "https://appcoretech.net", "https://www.appcoretech.net"])
              .WithHeaders("Content-Type")
              .WithMethods("GET", "POST"));
});

// Website limits per address : 5 requests / 10 min, 30 name checks / min
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, token) =>
        await context.HttpContext.Response.WriteAsJsonAsync(new { message = "Too many tries. Please wait a few minutes and try again." }, token);

    options.AddPolicy(SitePolicy.Submit, http =>
        RateLimitPartition.GetFixedWindowLimiter(
            VisitorIp.Of(http),
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));

    options.AddPolicy(SitePolicy.Check, http =>
        RateLimitPartition.GetFixedWindowLimiter(
            VisitorIp.Of(http),
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

// PascalCase JSON (as the ERP)
// No automatic "required" on non-nullable strings : each controller
// checks its own fields and answers { message } (e.g. an empty plan code)
builder.Services.AddControllers(o => o.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true)
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = null);

WebApplication app = builder.Build();

// ------------------------------------------------------------
// Pages served by this same service (put there by publish-console.cmd) :
//   console.<domain>  -> wwwroot\console  (the Console UI, staff only)
//   any other address -> wwwroot\site     (the AppCore Technologies website)
// Files as they are; any other non-API address gets that app's index.html
// (Angular routes such as /pricing). Not present in development.
// ------------------------------------------------------------
PhysicalFileProvider? Folder(string name)
{
    string path = Path.Combine(app.Environment.ContentRootPath, "wwwroot", name);

    return Directory.Exists(path) ? new PhysicalFileProvider(path) : null;
}

PhysicalFileProvider? siteFiles = Folder("site");
PhysicalFileProvider? consoleFiles = Folder("console");

PhysicalFileProvider? FilesFor(HttpContext context)
    => context.Request.Host.Host.StartsWith("console.", StringComparison.OrdinalIgnoreCase) ? consoleFiles : siteFiles;

app.Use(async (context, next) =>
{
    PhysicalFileProvider? files = FilesFor(context);

    if (files is not null && !context.Request.Path.StartsWithSegments("/api"))
    {
        string path = context.Request.Path.Value ?? "/";
        Microsoft.Extensions.FileProviders.IFileInfo file = files.GetFileInfo(path == "/" ? "/index.html" : path);

        if (file.Exists && !file.IsDirectory)
        {
            new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider().TryGetContentType(file.Name, out string? type);

            context.Response.ContentType = type ?? "application/octet-stream";

            // hashed bundle files never change; index.html must always be fresh
            context.Response.Headers.CacheControl = file.Name == "index.html" ? "no-cache" : "public, max-age=31536000, immutable";

            await context.Response.SendFileAsync(file);
            return;
        }
    }

    await next();
});

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// A staff user with a one-time password may only change it
app.Use(async (context, next) =>
{
    if (context.User.FindFirst("pwd_change")?.Value == "1"
        && !context.Request.Path.StartsWithSegments("/api/auth"))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { message = "Change your password first." });
        return;
    }

    await next();
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.MapControllers();

app.MapFallback(async context =>
{
    PhysicalFileProvider? files = FilesFor(context);

    if (files is null || context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    context.Response.ContentType = "text/html; charset=utf-8";
    context.Response.Headers.CacheControl = "no-cache";
    await context.Response.SendFileAsync(files.GetFileInfo("index.html"));
});

await StaffBootstrap.RunAsync(app.Services, app.Logger);

app.Run();
