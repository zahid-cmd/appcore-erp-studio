//===============================================================
// Public website endpoints (no sign-in) : api/public
// --------------------------------------------------------------
// Used by the AppCore Technologies website (appcoretech.net) :
//   GET  api/public/site                  website content (Console : Settings > Website settings)
//   GET  api/public/products              product list
//   GET  api/public/subdomain/{name}      is <name>.appcoretech.net free?
//   POST api/public/requests              demo / purchase request
//
// Guarded by : the "site" CORS policy (website origins only),
// a per-address rate limit, a hidden honeypot field, and strict
// field checks. Nothing here returns customer data.
//===============================================================

using System.Text.RegularExpressions;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


public record SiteRequestSubmit(
    string? RequestType,
    string? ProductCode,
    string? LegalName,
    string? DisplayName,
    string? BinNo,
    string? TinNo,
    string? Address,
    string? City,
    string? Country,
    string? ContactName,
    string? Designation,
    string? Phone,
    string? Email,
    int? Branches,
    int? Users,
    string? PreferredSubdomain,
    DateOnly? PreferredDate,
    string? PreferredTime,
    string? Message,
    string? HeardFrom,
    bool Consent,
    // honeypot : hidden on the form; people leave it empty, bots fill it
    string? Website);


[ApiController]
[AllowAnonymous]
[EnableCors(SitePolicy.Cors)]
[Route("api/public")]
public partial class PublicController : ControllerBase
{
    public const string Domain = "appcoretech.net";

    // never offered to a client
    private static readonly HashSet<string> Reserved =
    [
        "www", "erp", "console", "api", "admin", "app", "mail", "smtp", "ftp", "cdn", "static",
        "demo", "test", "staging", "dev", "support", "help", "billing", "status", "docs", "blog", "appcore"
    ];

    private readonly ControlDbContext _db;
    private readonly Audit _audit;

    public PublicController(ControlDbContext db, Audit audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet("site")]
    public async Task<IActionResult> Site()
    {
        SiteSetting? row = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(x => x.SettingKey == WebsiteSettings.Key);

        return Ok(WebsiteSettings.Read(row?.SettingValue));
    }

    [HttpGet("products")]
    public async Task<IActionResult> Products()
    {
        var rows =
            await _db.Products
                .Where(x => x.Status != "Retired")
                .OrderBy(x => x.DisplayOrder)
                .Select(x => new { x.ProductCode, x.ProductName, x.Industry, x.Description, x.Status })
                .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("subdomain/{name}")]
    [EnableRateLimiting(SitePolicy.Check)]
    public async Task<IActionResult> Subdomain(string name)
    {
        string sub = (name ?? string.Empty).Trim().ToLowerInvariant();

        string? problem = await SubdomainProblem(sub);

        return Ok(new { Name = sub, Host = $"{sub}.{Domain}", Available = problem is null, Reason = problem });
    }

    [HttpPost("requests")]
    [EnableRateLimiting(SitePolicy.Submit)]
    public async Task<IActionResult> Submit([FromBody] SiteRequestSubmit r)
    {
        // a filled honeypot : answer "ok" but keep nothing
        if (!string.IsNullOrWhiteSpace(r.Website))
        {
            return Ok(new { RequestNo = "REQ-00000" });
        }

        SiteSetting? setting = await _db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(x => x.SettingKey == WebsiteSettings.Key);
        WebsiteSettings site = WebsiteSettings.Read(setting?.SettingValue);

        if (!site.AcceptRequests)
        {
            return Bad("Online requests are paused. Please call or email us.");
        }

        string type = (r.RequestType ?? string.Empty).Trim();

        if (type is not ("Demo" or "Purchase"))
        {
            return Bad("Choose a demo or a purchase.");
        }

        if ((type == "Demo" && !site.DemoEnabled) || (type == "Purchase" && !site.PurchaseEnabled))
        {
            return Bad($"{type} requests are not taken online right now. Please call or email us.");
        }

        string productCode = (r.ProductCode ?? string.Empty).Trim().ToUpperInvariant();

        if (!await _db.Products.AnyAsync(x => x.ProductCode == productCode && x.Status != "Retired"))
        {
            return Bad("Choose the product.");
        }

        if (Required(r.LegalName, 200) is null) return Bad("Company name is required.");
        if (Required(r.ContactName, 150) is null) return Bad("Contact person is required.");
        if (Required(r.Country, 60) is null) return Bad("Country is required.");

        string? phone = Required(r.Phone, 30);

        if (phone is null || !PhonePattern().IsMatch(phone))
        {
            return Bad("Enter a valid phone number.");
        }

        string? email = Required(r.Email, 150)?.ToLowerInvariant();

        if (email is null || !EmailPattern().IsMatch(email))
        {
            return Bad("Enter a valid email address.");
        }

        if (r.Branches is < 1 or > 500) return Bad("Branches must be between 1 and 500.");
        if (r.Users is < 1 or > 5000) return Bad("Users must be between 1 and 5000.");

        string? sub = Optional(r.PreferredSubdomain, 63)?.ToLowerInvariant();

        if (sub is not null && await SubdomainProblem(sub) is string subProblem)
        {
            return Bad(subProblem);
        }

        if (r.PreferredDate is DateOnly d && (d < DateOnly.FromDateTime(DateTime.UtcNow.Date) || d > DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(120))))
        {
            return Bad("Pick a demo date within the next four months.");
        }

        if (!r.Consent)
        {
            return Bad("Please agree that AppCore may contact you about this request.");
        }

        string requestNo = await NextNumber();

        SiteRequest row = new()
        {
            RequestNo = requestNo,
            RequestType = type,
            ProductCode = productCode,
            LegalName = Required(r.LegalName, 200)!,
            DisplayName = Optional(r.DisplayName, 200),
            BinNo = Optional(r.BinNo, 20),
            TinNo = Optional(r.TinNo, 20),
            Address = Optional(r.Address, 500),
            City = Optional(r.City, 100),
            Country = Optional(r.Country, 60),
            ContactName = Required(r.ContactName, 150)!,
            Designation = Optional(r.Designation, 100),
            Phone = phone,
            Email = email,
            Branches = r.Branches,
            Users = r.Users,
            PreferredSubdomain = sub,
            PreferredDate = r.PreferredDate,
            PreferredTime = Optional(r.PreferredTime, 20),
            Message = Optional(r.Message, 2000),
            HeardFrom = Optional(r.HeardFrom, 60),
            IpAddress = VisitorIp.Of(HttpContext),
            UserAgent = Optional(Request.Headers.UserAgent.ToString(), 300)
        };

        _db.SiteRequests.Add(row);

        _audit.Add("SiteRequest.Create", "SiteRequest", requestNo, details: $"{type} {productCode} : {row.LegalName}");

        await _db.SaveChangesAsync();

        return Ok(new { row.RequestNo });
    }

    // null = free to use
    private async Task<string?> SubdomainProblem(string sub)
    {
        if (!SubdomainPattern().IsMatch(sub))
        {
            return "Use 3 to 30 letters, digits or '-' (not at the start or end).";
        }

        if (Reserved.Contains(sub))
        {
            return "That name is reserved. Try another.";
        }

        string host = $"{sub}.{Domain}";

        if (await _db.TenantDomains.AnyAsync(x => x.HostName == host))
        {
            return "That address is already taken.";
        }

        return null;
    }

    private async Task<string> NextNumber()
    {
        int next = await _db.SiteRequests.CountAsync() + 1;

        string no;

        do
        {
            no = $"REQ-{next:00000}";
            next++;
        }
        while (await _db.SiteRequests.AnyAsync(x => x.RequestNo == no));

        return no;
    }

    private BadRequestObjectResult Bad(string message)
        => BadRequest(new { message });

    private static string? Required(string? value, int max)
    {
        string? v = Optional(value, max);

        return string.IsNullOrWhiteSpace(v) ? null : v;
    }

    private static string? Optional(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        string v = value.Trim();

        return v.Length > max ? v[..max] : v;
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$")]
    private static partial Regex SubdomainPattern();

    [GeneratedRegex(@"^\+?[0-9][0-9 \-]{6,18}[0-9]$")]
    private static partial Regex PhonePattern();

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")]
    private static partial Regex EmailPattern();
}

// Names of the website policies (CORS + rate limits, Program.cs)
public static class SitePolicy
{
    public const string Cors = "site";
    public const string Submit = "site-submit";
    public const string Check = "site-check";
}
