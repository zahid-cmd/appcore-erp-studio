//===============================================================
// Namespaces
//===============================================================

using System.Text;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using AppCore.Api.BackgroundJobs;
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
// Run Application
//===============================================================

app.Run();