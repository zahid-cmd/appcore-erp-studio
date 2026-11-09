//===============================================================
// Namespaces
//===============================================================

using System.Text;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using AppCore.Api.BackgroundJobs;
using AppCore.Api.Platform.Chat;
using AppCore.Api.Platform.Uploads;
using AppCore.Api.Security;
using AppCore.Application;
using AppCore.Application.Platform.CurrentUser;
using AppCore.Infrastructure;


//===============================================================
// Builder
//===============================================================

var builder =
    WebApplication.CreateBuilder(
        args
    );


//===============================================================
// Windows Service
//===============================================================
//
// On a server the API runs as the Windows service "AppCoreERP"
// (installed by the Deploy Agent). Harmless when started by
// dotnet run / Visual Studio.
//
//===============================================================

builder.Services.AddWindowsService();


//===============================================================
// Add Controllers
//===============================================================

builder.Services.AddControllers();


//===============================================================
// Current User
//===============================================================
//
// Reads the logged-in user (UserProfileId, Login ID, Display
// Name, Branch) from the login token of the current request.
//
// Controllers : this.CurrentUserId() / this.CurrentUserName()
// Repositories: inject ICurrentUserService
//
// Outside a request (background jobs) it falls back to System.
//
//===============================================================

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();


//===============================================================
// Swagger
//===============================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();


//===============================================================
// Application Layer
//===============================================================

builder.Services.AddApplication();


//===============================================================
// Infrastructure Layer
//===============================================================

builder.Services.AddInfrastructure(
    builder.Configuration
);


//===============================================================
// Background Jobs
//===============================================================
//
// MFS Auto Settlement : every night at 23:59 (Bangladesh time)
// settles the due Merchant wallet receipts when switch
// CFG-MOD-004-0051 is ON; catches up missed days on start.
//
//===============================================================

builder.Services.AddHostedService<MfsAutoSettlementService>();

// POS Auto Settlement : the same, switch CFG-MOD-004-0054

builder.Services.AddHostedService<PosAutoSettlementService>();

// Nightly backup of the App database (Data Management)
builder.Services.AddHostedService<NightlyBackupService>();

// Next financial year : created automatically N days before the
// current one ends when switch CFG-MOD-003-0111 is ON
builder.Services.AddHostedService<FinancialYearAutoCreateJob>();

// Uploaded pictures mirrored into the database (StoredFiles), so
// every PC on the same database shows them (Platform\Uploads)
builder.Services.AddSingleton<UploadsMirror>();


//===============================================================
// Team Chat (SignalR hub /hubs/chat + who is online)
//===============================================================

builder.Services.AddSignalR(
    options =>
    {
        // pictures go by the REST API, not the hub
        options.MaximumReceiveMessageSize = 64 * 1024;
    });

builder.Services.AddSingleton<ChatPresence>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<UploadsMirror>());


//===============================================================
// JWT Authentication
//===============================================================

string jwtKey =
    builder.Configuration["Jwt:Key"]
    ??
    string.Empty;


string jwtIssuer =
    builder.Configuration["Jwt:Issuer"]
    ??
    string.Empty;


string jwtAudience =
    builder.Configuration["Jwt:Audience"]
    ??
    string.Empty;


//===============================================================
// JWT Key Validation
//===============================================================

if
(
    string.IsNullOrWhiteSpace(
        jwtKey
    )
)
{
    throw new InvalidOperationException(
        "JWT configuration 'Jwt:Key' is not configured."
    );
}


//===============================================================
// Authentication
//===============================================================

builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme
)
.AddJwtBearer(
    options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey =
                    true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtKey
                        )
                    ),

                ValidateIssuer =
                    !string.IsNullOrWhiteSpace(
                        jwtIssuer
                    ),

                ValidIssuer =
                    jwtIssuer,

                ValidateAudience =
                    !string.IsNullOrWhiteSpace(
                        jwtAudience
                    ),

                ValidAudience =
                    jwtAudience,

                ValidateLifetime =
                    true,

                ClockSkew =
                    TimeSpan.Zero
            };

        // Team Chat : a WebSocket cannot send the Authorization
        // header, so the hub's token comes as ?access_token=
        options.Events =
            new JwtBearerEvents
            {
                OnMessageReceived =
                    context =>
                    {
                        string? token =
                            context.Request.Query["access_token"];

                        if
                        (
                            !string.IsNullOrEmpty(token)
                            &&
                            context.HttpContext.Request.Path.StartsWithSegments("/hubs")
                        )
                        {
                            context.Token = token;
                        }

                        return Task.CompletedTask;
                    }
            };
    }
);


//===============================================================
// Authorization
//===============================================================
//
// Login required everywhere (fallback policy).
//
// Every controller / endpoint needs a valid login token unless it
// is marked [AllowAnonymous]. Open endpoints (used by the login
// page before anyone is logged in) :
//
//     api/authentication/login, register, forgot-password/*
//     api/infrastructure-control/application-configuration/login-pages/active
//     api/infrastructure-control/login-components/sub-ordinate-components/{id}
//     api/settings/general-settings/company        (GET list : name on login)
//     api/platform/current-user                    (who am I)
//
// Static files (wwwroot/uploads) and Swagger are not affected.
//===============================================================

builder.Services.AddAuthorization(
    options =>
    {
        options.FallbackPolicy =
            new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
    }
);


//===============================================================
// API Security : CORS, Rate Limiting, Real Client IP
//===============================================================
//
// See Security/ApiSecurityExtensions.cs. Settings : the optional
// "Security" section (Security/ApiSecurityOptions.cs).
//
// CORS : only listed web addresses may call the API from a
// browser. On the development PC (nothing listed) that is the
// Angular app at http://localhost:4100. In production the app and
// the API share one address per dealer, so CORS is not needed.
//
// Rate limits : per user when logged in, per IP otherwise; login
// and heavy tasks (backup, restore, reset) have tighter limits.
// Over the limit the API answers 429 with the seconds to wait.
//
//===============================================================

builder.AddApiSecurity();


//===============================================================
// Build Application
//===============================================================

var app =
    builder.Build();


//===============================================================
// Real Client IP (behind nginx / IIS)
//===============================================================
//
// Must run first : later steps (rate limits, website enquiry
// limit, logs) read the visitor's real IP.
//
//===============================================================

app.UseForwardedHeaders();


//===============================================================
// Swagger Middleware
//===============================================================

if
(
    app.Environment.IsDevelopment()
)
{
    app.UseSwagger();

    app.UseSwaggerUI();
}


//===============================================================
// HTTPS Redirection
//===============================================================

app.UseHttpsRedirection();


//===============================================================
// Routing
//===============================================================

app.UseRouting();


//===============================================================
// CORS
//===============================================================

app.UseCors(
    ApiSecurity.CorsPolicy
);


//===============================================================
// Static Files
//===============================================================
//
// Serves:
//
//     wwwroot/
//
// Including:
//
//     wwwroot/uploads/
//
// Example:
//
//     wwwroot/uploads/sub-ordinate-components/1/light-image.png
//
// Browser URL:
//
//     /uploads/sub-ordinate-components/1/light-image.png
//
//===============================================================

// A picture not on this PC yet is fetched from StoredFiles first
app.UseMiddleware<UploadsFallbackMiddleware>();

//===============================================================
// Angular UI (deployed releases)
//===============================================================
//
// A release built by the Deployment Center carries the UI in
// wwwroot. A page address (/, /login, /sales/... : not /api and
// not a file) is answered with index.html by the static files,
// before any login check, so the login page can open. Angular
// then shows the right page. Development (no index.html):
// nothing changes.
//
//===============================================================

bool hasUi =
    File.Exists(
        Path.Combine(
            app.Environment.WebRootPath
            ??
            Path.Combine(app.Environment.ContentRootPath, "wwwroot"),
            "index.html"
        )
    );

if (hasUi)
{
    app.Use(
        async (context, next) =>
        {
            string path =
                context.Request.Path.Value ?? "/";

            if
            (
                (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method))
                &&
                !path.StartsWith("/api", StringComparison.OrdinalIgnoreCase)
                &&
                !path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
                &&
                !Path.HasExtension(path)
            )
            {
                context.Request.Path = "/index.html";

                // no API endpoint for this address
                context.SetEndpoint(null);
            }

            await next();
        }
    );
}

app.UseStaticFiles();


//===============================================================
// Ensure Upload Directory Exists
//===============================================================
//
// All uploaded files are stored under:
//
//     wwwroot/uploads/
//
//===============================================================

string uploadsPath =
    Path.Combine(
        app.Environment.WebRootPath
        ??
        Path.Combine(
            app.Environment.ContentRootPath,
            "wwwroot"
        ),
        "uploads"
    );


Directory.CreateDirectory(
    uploadsPath
);


//===============================================================
// Authentication
//===============================================================

app.UseAuthentication();


//===============================================================
// Rate Limiting
//===============================================================
//
// After authentication (limits are per logged-in user) and before
// authorization.
//
//===============================================================

app.UseRateLimiter();


//===============================================================
// Authorization
//===============================================================

app.UseAuthorization();


//===============================================================
// Map Controllers
//===============================================================

app.MapControllers();


//===============================================================
// Team Chat hub (login required, fallback policy)
//===============================================================

app.MapHub<ChatHub>("/hubs/chat");




//===============================================================
// Run Application
//===============================================================

app.Run();