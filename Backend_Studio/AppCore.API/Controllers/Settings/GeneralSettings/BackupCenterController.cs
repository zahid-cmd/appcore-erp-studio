//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using AppCore.Api.Security;

using AppCore.Application.Platform.CurrentUser;
using AppCore.Application.Platform.DataManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.GeneralSettings;

//===============================================================
// Backup Center Controller (client side)
//
// Settings › General Settings › Backup Center
//   GET  : nightly status + last 10 backups of the App database
//          (needs View on the page)
//   POST backup : a backup now, kind Client (needs the page
//          activity "Take Backup")
// AppCore Admin (RP-001) may always do both. No restore, delete,
// download or folders here (those are on the developer pages).
//===============================================================

[ApiController]

[Route("api/settings/general-settings/backup-center")]

public class BackupCenterController : ControllerBase
{
    private const string PageRoute = "/settings/%/backup-center";

    private const string TakeBackupActivity = "Take Backup";

    private readonly IDataManagementService _service;

    private readonly IEffectiveAccessRepository _access;

    private readonly ICurrentUserService _currentUser;

    public BackupCenterController
    (
        IDataManagementService service,
        IEffectiveAccessRepository access,
        ICurrentUserService currentUser
    )
    {
        _service = service;
        _access = access;
        _currentUser = currentUser;
    }

    public class BackupCenterRequestDto
    {
        public string Note { get; set; } = string.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        long userId = this.CurrentUserId();

        bool admin = await _service.IsAppCoreAdminAsync(userId);

        if (!admin && !await _access.HasActivityAsync(userId, PageRoute, "View"))
        {
            return StatusCode(403, new { message = "You cannot open the Backup Center." });
        }

        bool canTake =
            admin || await _access.HasActivityAsync(userId, PageRoute, TakeBackupActivity);

        try
        {
            return Ok(await _service.GetBackupCenterAsync(canTake));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("backup")]
    [EnableRateLimiting(ApiSecurity.HeavyPolicy)]
    public async Task<IActionResult> Backup([FromBody] BackupCenterRequestDto request)
    {
        long userId = this.CurrentUserId();

        bool allowed =
            await _service.IsAppCoreAdminAsync(userId)
            || await _access.HasActivityAsync(userId, PageRoute, TakeBackupActivity);

        if (!allowed)
        {
            return StatusCode(403, new { message = "Taking a backup needs the \"Take Backup\" activity on the Backup Center." });
        }

        string userName =
            string.IsNullOrWhiteSpace(_currentUser.PerformedByName)
                ? this.CurrentUserName()
                : _currentUser.PerformedByName;

        try
        {
            DataBackupResultDto result =
                await _service.TakeClientBackupAsync(request?.Note ?? string.Empty, userName);

            // The client sees no folders or servers
            result.Backup.Host = string.Empty;
            result.Backup.TakenOn = string.Empty;
            result.Backup.ToolsVersion = string.Empty;

            return Ok(new
            {
                fileName = result.Backup.FileName,
                sizeBytes = result.Backup.SizeBytes,
                takenDate = result.Backup.TakenDate,
                savedOnBothPcs = result.Backup.OnOtherPc,
                warning = string.IsNullOrEmpty(result.OtherPcMessage) ? string.Empty : "Saved on this PC only : the copy to the second PC failed."
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
