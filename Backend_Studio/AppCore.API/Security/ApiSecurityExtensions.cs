//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Net;
using System.Threading.RateLimiting;

using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Security;


//===============================================================
// API Security : CORS, Rate Limiting, Real Client IP
//---------------------------------------------------------------
// Program.cs :
//
//     builder.AddApiSecurity();          (services)
//
//     app.UseForwardedHeaders();         (first)
//     ...
//     app.UseCors(ApiSecurity.CorsPolicy);
//     ...
//     app.UseAuthentication();
//     app.UseRateLimiter();              (after login is read)
//     app.UseAuthorization();
//
// Rate limits :
//
//     Every call      logged in : per user, about 300 a minute
//                     (bursts of 100 allowed)
//                     not logged in : per IP, about 300 a minute
//
//     [EnableRateLimiting(ApiSecurity.LoginPolicy)]
//                     login / register / forgot-password :
//                     20 a minute per IP
//                     + 5 wrong passwords in 5 minutes per Login ID
//                       → wait 60 seconds
//                       (LoginAttemptGuard)
//
//     [EnableRateLimiting(ApiSecurity.HeavyPolicy)]
//                     Backup / Restore / Data Reset / Copy :
//                     2 at the same time per user
//
// A refused call answers 429 :
//
//     Retry-After: 40
//     { "success": false, "message": "Too many requests. ...",
//       "retryAfterSeconds": 40 }
//===============================================================

public static class ApiSecurity
{
    public const string CorsPolicy =
        "AppCoreCors";

    public const string LoginPolicy =
        "login";

    public const string HeavyPolicy =
        "heavy";

    private const string DevelopmentOrigin =
        "http://localhost:4100";


    //===========================================================
    // Services
    //===========================================================

    public static WebApplicationBuilder AddApiSecurity(
        this WebApplicationBuilder builder)
    {
        ApiSecurityOptions options =
            builder.Configuration
                .GetSection(ApiSecurityOptions.SectionName)
                .Get<ApiSecurityOptions>()
            ?? new ApiSecurityOptions();

        builder.Services.AddSingleton(options);

        builder.Services.AddMemoryCache();

        builder.Services.AddSingleton<LoginAttemptGuard>();

        AddForwardedHeaders(builder.Services, options.Proxy);

        AddCorsPolicy(builder, options.Cors);

        AddRateLimits(builder.Services, options.RateLimits);

        return builder;
    }


    //===========================================================
    // Real client IP behind nginx / IIS
    //===========================================================

    private static void AddForwardedHeaders(
        IServiceCollection services,
        ProxySettings proxy)
    {
        services.Configure<ForwardedHeadersOptions>(
            options =>
            {
                options.ForwardedHeaders =
                    ForwardedHeaders.XForwardedFor |
                    ForwardedHeaders.XForwardedProto |
                    ForwardedHeaders.XForwardedHost;

                // 127.0.0.1 and ::1 are trusted by default
                foreach (string address in Clean(proxy.KnownProxies))
                {
                    if (IPAddress.TryParse(address, out IPAddress? ip))
                    {
                        options.KnownProxies.Add(ip);
                    }
                }
            });
    }


    //===========================================================
    // CORS
    //===========================================================

    private static void AddCorsPolicy(
        WebApplicationBuilder builder,
        CorsSettings cors)
    {
        string[] exact =
            Clean(cors.AllowedOrigins)
                .Select(x => x.TrimEnd('/'))
                .ToArray();

        string[] wildcards =
            Clean(cors.AllowedWildcardOrigins)
                .Select(x => x.TrimEnd('/'))
                .ToArray();

        // Nothing listed : the development Angular app only
        if (exact.Length == 0 &&
            wildcards.Length == 0)
        {
            exact = [DevelopmentOrigin];
        }

        builder.Services.AddCors(
            options =>
            {
                options.AddPolicy(
                    CorsPolicy,
                    policy =>
                    {
                        policy
                            .SetIsOriginAllowed(origin => IsOriginAllowed(origin, exact, wildcards))
                            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                            .AllowAnyHeader()
                            .WithExposedHeaders("Content-Disposition", "Retry-After")
                            .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
                    });
            });
    }


    // Exact address, or a subdomain of a wildcard address :
    //   https://*.appcore.com.bd allows https://rahim.appcore.com.bd
    private static bool IsOriginAllowed(
        string origin,
        string[] exact,
        string[] wildcards)
    {
        if (string.IsNullOrWhiteSpace(origin))
        {
            return false;
        }

        string clean =
            origin.Trim().TrimEnd('/');

        if (exact.Any(x => string.Equals(x, clean, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        if (!Uri.TryCreate(clean, UriKind.Absolute, out Uri? uri))
        {
            return false;
        }

        foreach (string wildcard in wildcards)
        {
            int marker =
                wildcard.IndexOf("://*.", StringComparison.Ordinal);

            if (marker <= 0)
            {
                continue;
            }

            string scheme =
                wildcard[..marker];

            // e.g. appcore.com.bd (or appcore.com.bd:8443)
            string domain =
                wildcard[(marker + 5)..];

            if (string.Equals(uri.Scheme, scheme, StringComparison.OrdinalIgnoreCase) &&
                uri.Authority.Length > domain.Length + 1 &&
                uri.Authority.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }


    //===========================================================
    // Rate Limits
    //===========================================================

    private static void AddRateLimits(
        IServiceCollection services,
        RateLimitSettings limits)
    {
        services.AddRateLimiter(
            options =>
            {
                options.RejectionStatusCode =
                    StatusCodes.Status429TooManyRequests;

                options.OnRejected =
                    OnRejectedAsync;

                //---------------------------------------------------
                // Every call
                //---------------------------------------------------

                options.GlobalLimiter =
                    PartitionedRateLimiter.Create<HttpContext, string>(
                        context =>
                        {
                            if (!limits.Enabled)
                            {
                                return RateLimitPartition.GetNoLimiter("off");
                            }

                            if (context.User.IsLoggedIn())
                            {
                                return RateLimitPartition.GetTokenBucketLimiter(
                                    "user:" + context.User.GetUserId().ToString(CultureInfo.InvariantCulture),
                                    _ => Bucket(limits.UserRequestsPerMinute, limits.UserBurst));
                            }

                            return RateLimitPartition.GetTokenBucketLimiter(
                                "ip:" + ClientIp(context),
                                _ => Bucket(limits.AnonymousRequestsPerMinute, limits.AnonymousRequestsPerMinute / 3));
                        });

                //---------------------------------------------------
                // Login / register / forgot-password : per IP
                //---------------------------------------------------

                options.AddPolicy(
                    LoginPolicy,
                    context =>
                    {
                        if (!limits.Enabled)
                        {
                            return RateLimitPartition.GetNoLimiter("off");
                        }

                        return RateLimitPartition.GetFixedWindowLimiter(
                            "login:" + ClientIp(context),
                            _ => new FixedWindowRateLimiterOptions
                            {
                                PermitLimit = Math.Max(1, limits.LoginRequestsPerMinutePerIp),
                                Window = TimeSpan.FromMinutes(1),
                                QueueLimit = 0,
                                AutoReplenishment = true
                            });
                    });

                //---------------------------------------------------
                // Heavy work : at the same time, per user
                //---------------------------------------------------

                options.AddPolicy(
                    HeavyPolicy,
                    context =>
                    {
                        if (!limits.Enabled)
                        {
                            return RateLimitPartition.GetNoLimiter("off");
                        }

                        string key =
                            context.User.IsLoggedIn()
                                ? "heavy-user:" + context.User.GetUserId().ToString(CultureInfo.InvariantCulture)
                                : "heavy-ip:" + ClientIp(context);

                        return RateLimitPartition.GetConcurrencyLimiter(
                            key,
                            _ => new ConcurrencyLimiterOptions
                            {
                                PermitLimit = Math.Max(1, limits.HeavyTasksPerUser),
                                QueueLimit = 0
                            });
                    });
            });
    }


    // perMinute spread over 5-second steps, plus a burst allowance
    private static TokenBucketRateLimiterOptions Bucket(
        int perMinute,
        int burst)
    {
        int rate =
            Math.Max(12, perMinute);

        return new TokenBucketRateLimiterOptions
        {
            TokenLimit = Math.Max(rate / 12, burst),
            TokensPerPeriod = Math.Max(1, rate / 12),
            ReplenishmentPeriod = TimeSpan.FromSeconds(5),
            QueueLimit = 0,
            AutoReplenishment = true
        };
    }


    //===========================================================
    // 429 answer
    //===========================================================

    private static async ValueTask OnRejectedAsync(
        OnRejectedContext context,
        CancellationToken cancellationToken)
    {
        HttpContext http =
            context.HttpContext;

        int? seconds =
            null;

        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter))
        {
            seconds =
                Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));

            http.Response.Headers.RetryAfter =
                seconds.Value.ToString(CultureInfo.InvariantCulture);
        }

        string message =
            seconds is null
                ? "Another task of this kind is still running. Please wait for it to finish."
                : $"Too many requests. Please wait {seconds} seconds and try again.";

        http.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("AppCore.RateLimiting")
            .LogWarning(
                "Rate limit : {Method} {Path} refused for {User} from {Ip}.",
                http.Request.Method,
                http.Request.Path.Value,
                http.User.IsLoggedIn() ? http.User.GetLoginId() : "(not logged in)",
                ClientIp(http));

        http.Response.StatusCode =
            StatusCodes.Status429TooManyRequests;

        await http.Response.WriteAsJsonAsync(
            new
            {
                success = false,
                message,
                retryAfterSeconds = seconds
            },
            cancellationToken);
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Real visitor IP (UseForwardedHeaders has already applied a
    // trusted proxy's X-Forwarded-For)
    public static string ClientIp(
        HttpContext context)
    {
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }


    private static IEnumerable<string> Clean(
        string[]? values)
    {
        return (values ?? Array.Empty<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase);
    }
}
