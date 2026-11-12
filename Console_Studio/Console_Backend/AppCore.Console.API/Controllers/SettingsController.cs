//===============================================================
// Console settings : api/settings
// --------------------------------------------------------------
// website : the public website's content and switches
// (Settings > Website settings). Read by any staff user, saved by
// the Owner only. The website reads it through api/public/site.
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


[ApiController]
[Authorize]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly ControlDbContext _db;
    private readonly Audit _audit;

    public SettingsController(ControlDbContext db, Audit audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet("website")]
    public async Task<IActionResult> GetWebsite()
    {
        SiteSetting? row = await _db.SiteSettings.FirstOrDefaultAsync(x => x.SettingKey == WebsiteSettings.Key);

        return Ok(new
        {
            Settings = WebsiteSettings.Read(row?.SettingValue),
            Saved = row is not null,
            row?.ModifiedDate
        });
    }

    [HttpPut("website")]
    [Authorize(Roles = StaffRoles.Owner)]
    public async Task<IActionResult> SaveWebsite([FromBody] WebsiteSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.CompanyName))
        {
            return BadRequest(new { message = "Company name is required." });
        }

        if (string.IsNullOrWhiteSpace(settings.HeroTitle))
        {
            return BadRequest(new { message = "The home page title is required." });
        }

        settings.Plans = settings.Plans
            .Where(p => !string.IsNullOrWhiteSpace(p.Name))
            .Select((p, i) =>
            {
                p.Name = p.Name.Trim();
                p.Code = string.IsNullOrWhiteSpace(p.Code) ? $"PLAN-{i + 1}" : p.Code.Trim().ToUpperInvariant();
                p.Features = p.Features.Where(f => !string.IsNullOrWhiteSpace(f)).Select(f => f.Trim()).ToList();

                return p;
            })
            .ToList();

        if (settings.Plans.Any(p => p.MonthlyPrice < 0 || p.SetupFee < 0))
        {
            return BadRequest(new { message = "Prices cannot be negative." });
        }

        settings.Stats = settings.Stats.Where(s => !string.IsNullOrWhiteSpace(s.Value)).ToList();

        SiteSetting? row = await _db.SiteSettings.FirstOrDefaultAsync(x => x.SettingKey == WebsiteSettings.Key);

        if (row is null)
        {
            row = new SiteSetting { SettingKey = WebsiteSettings.Key };

            _db.SiteSettings.Add(row);
        }

        row.SettingValue = settings.Write();
        row.ModifiedDate = DateTime.UtcNow;
        row.ModifiedBy = User.StaffId();

        _audit.Add("Settings.Website", "SiteSetting", WebsiteSettings.Key);

        await _db.SaveChangesAsync();

        return Ok(new { row.ModifiedDate });
    }
}
