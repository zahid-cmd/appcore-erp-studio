//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using AppCore.Api.Security;

using AppCore.Application.Platform.CurrentUser;
using AppCore.Application.Platform.DataManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.DataManagement;

//===============================================================
// Data Management Controller
//
// Infrastructure Control › Data Management
//   Database Backups · Data Reset · Reset History
//
// Every call : role RP-001 (AppCore Admin) or 403. A broken rule
// answers 400 { message }.
//===============================================================

[ApiController]

[Route("api/infrastructure-control/data-management")]

public class DataManagementController : ControllerBase
{
    private readonly IDataManagementService _service;

    private readonly ICurrentUserService _currentUser;

    public DataManagementController
    (
        IDataManagementService service,
        ICurrentUserService currentUser
    )
    {
        _service = service;
        _currentUser = currentUser;
    }

    //===========================================================
    // Access
    //===========================================================

    // Allowed or not (the page shows a message instead of 403)
    [HttpGet("access")]
    public async Task<IActionResult> GetAccess()
    {
        bool allowed =
            await _service.IsAppCoreAdminAsync(this.CurrentUserId());

        return Ok(new { allowed });
    }

    //===========================================================
    // Status / settings
    //===========================================================

    [HttpGet("status")]
    public Task<IActionResult> GetStatus()
    {
        return Run(() => _service.GetStatusAsync());
    }

    [HttpGet("server-info")]
    public Task<IActionResult> GetServerInfo([FromQuery] string connection)
    {
        return Run(() => _service.GetServerInfoAsync(connection));
    }

    [HttpPut("settings")]
    public Task<IActionResult> SaveSettings([FromBody] DataSettingsDto settings)
    {
        return Run(() => _service.SaveSettingsAsync(settings));
    }

    //===========================================================
    // Backups
    //===========================================================

    [HttpGet("backups")]
    public Task<IActionResult> GetBackups()
    {
        return Run(() => _service.GetBackupsAsync());
    }

    [HttpPost("backups")]
    [EnableRateLimiting(ApiSecurity.HeavyPolicy)]
    public Task<IActionResult> Backup([FromBody] DataBackupRequestDto request)
    {
        return Run(() => _service.BackupAsync(request, UserName));
    }

    [HttpGet("backups/download")]
    public async Task<IActionResult> Download([FromQuery] string fileName)
    {
        if (!await _service.IsAppCoreAdminAsync(this.CurrentUserId()))
        {
            return Forbidden();
        }

        try
        {
            string? path =
                _service.FindBackupFile(fileName);

            if (path == null)
            {
                return NotFound(new { message = $"{fileName} was not found in either backup folder." });
            }

            return PhysicalFile(path, "application/octet-stream", Path.GetFileName(path), enableRangeProcessing: true);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("backups/copy")]
    [EnableRateLimiting(ApiSecurity.HeavyPolicy)]
    public Task<IActionResult> Copy([FromBody] DataFileRequestDto request)
    {
        return Run(() => _service.CopyToOtherPcAsync(request.FileName, UserName));
    }

    [HttpPost("backups/delete")]
    public Task<IActionResult> Delete([FromBody] DataFileRequestDto request)
    {
        return Run(async () =>
        {
            await _service.DeleteBackupAsync(request, UserName);

            return new { message = "Deleted." };
        });
    }

    [HttpPost("backups/restore")]
    [EnableRateLimiting(ApiSecurity.HeavyPolicy)]
    public Task<IActionResult> Restore([FromBody] DataRestoreRequestDto request)
    {
        return Run(() => _service.RestoreAsync(request, UserName));
    }

    //===========================================================
    // Data Reset
    //===========================================================

    [HttpGet("reset/catalog")]
    public Task<IActionResult> GetResetCatalog([FromQuery] string connection)
    {
        return Run(() => _service.GetResetCatalogAsync(connection));
    }

    [HttpPost("reset/preview")]
    public Task<IActionResult> PreviewReset([FromBody] DataResetRequestDto request)
    {
        return Run(() => _service.PreviewResetAsync(request));
    }

    [HttpPost("reset/run")]
    [EnableRateLimiting(ApiSecurity.HeavyPolicy)]
    public Task<IActionResult> RunReset([FromBody] DataResetRequestDto request)
    {
        return Run(() => _service.RunResetAsync(request, UserName));
    }

    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(() => _service.GetHistoryAsync());
    }

    //===========================================================
    // Helpers
    //===========================================================

    private string UserName =>
        string.IsNullOrWhiteSpace(_currentUser.PerformedByName)
            ? this.CurrentUserName()
            : _currentUser.PerformedByName;

    private ObjectResult Forbidden()
    {
        return StatusCode(403, new { message = "Only the AppCore Admin role (RP-001) can use Data Management." });
    }

    private async Task<IActionResult> Run<T>(Func<Task<T>> action)
    {
        if (!await _service.IsAppCoreAdminAsync(this.CurrentUserId()))
        {
            return Forbidden();
        }

        try
        {
            return Ok(await action());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
