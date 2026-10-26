//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.GeneralSettings;


//===============================================================
// System Configurations Controller
//
//   GET  values                    code / ON-OFF / value of every
//                                  switch (any logged-in user;
//                                  what other pages read)
//   GET  workspace                 the page, filtered for the user
//   GET                            switches the user may see
//   GET  {id}
//   GET  next-code / defaults      (per module)
//   GET  history
//   POST apply                     Review & Apply (staged changes)
//   PUT  {id}/enabled              one switch (same rules)
//   GET  requests                  pending approvals   (admin)
//   POST requests/{id}/approve                         (admin)
//   POST requests/{id}/reject                          (admin)
//   POST / PUT / DELETE / restore  definitions         (admin)
//
// Error mapping:
//   UnauthorizedAccessException → 403
//   KeyNotFoundException        → 404
//   InvalidOperationException   → 400 (create / update / apply)
//                               → 409 (delete / restore / approve)
//   Anything else               → 500 (logged)
//===============================================================

[ApiController]

[Route("api/settings/general-settings/system-configurations")]

public class SystemConfigurationsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly ISystemConfigurationsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<SystemConfigurationsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public SystemConfigurationsController(
        ISystemConfigurationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<SystemConfigurationsController> logger)
    {
        _repository =
            repository;

        _activityHistoryRepository =
            activityHistoryRepository;

        _logger =
            logger;
    }


    //===========================================================
    // Forbidden (403) with a message
    //===========================================================

    private ObjectResult Forbidden(
        string message)
    {
        return StatusCode(403, message);
    }


    //===========================================================
    // Runtime Values (every logged-in user)
    //===========================================================

    [HttpGet("values")]

    public async Task<ActionResult<List<SystemConfigurationValueDto>>> GetValues()
    {
        try
        {
            return Ok(
                await _repository.GetValuesAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load configuration values.");

            return StatusCode(500, "Unable to load configuration values.");
        }
    }


    //===========================================================
    // Workspace (the page for the logged-in user)
    //===========================================================

    [HttpGet("workspace")]

    public async Task<ActionResult<SystemConfigurationWorkspaceDto>> GetWorkspace()
    {
        try
        {
            return Ok(
                await _repository.GetWorkspaceAsync(
                    this.CurrentUserId()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the configuration workspace.");

            return StatusCode(500, "Unable to load system configurations.");
        }
    }


    //===========================================================
    // Get All (switches the user may see)
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<SystemConfigurationsDto>>> GetAll()
    {
        try
        {
            return Ok(
                await _repository.GetAllAsync(
                    this.CurrentUserId()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load system configurations.");

            return StatusCode(500, "Unable to load system configurations.");
        }
    }


    //===========================================================
    // Get Next Code (per module)
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        [FromQuery] long navigationModuleId)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    navigationModuleId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate configuration code for module {NavigationModuleId}.", navigationModuleId);

            return StatusCode(500, "Unable to generate configuration code.");
        }
    }


    //===========================================================
    // Get Defaults (per module)
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<SystemConfigurationsDefaultsDto>> GetDefaults(
        [FromQuery] long navigationModuleId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    navigationModuleId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load configuration defaults for module {NavigationModuleId}.", navigationModuleId);

            return StatusCode(500, "Unable to load configuration defaults.");
        }
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        try
        {
            List<ActivityHistoryDto> history =
                await _activityHistoryRepository.GetListHistoryAsync(
                    "General Settings",
                    "SystemConfiguration");

            // Only the switches this user may see (admins : all)
            HashSet<long>? visible =
                await _repository.GetVisibleIdsAsync(
                    this.CurrentUserId());

            return Ok(
                visible == null
                    ? history
                    : history.Where(x => visible.Contains(x.EntityId)).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load system configuration history.");

            return StatusCode(500, "Unable to load configuration history.");
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<SystemConfigurationsDto>> GetById(
        long id)
    {
        try
        {
            SystemConfigurationsDto? configuration =
                await _repository.GetByIdAsync(
                    id,
                    this.CurrentUserId());

            if (configuration == null)
            {
                return NotFound("Configuration not found.");
            }

            return Ok(configuration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load configuration {SystemConfigurationId}.", id);

            return StatusCode(500, "Unable to load configuration.");
        }
    }


    //===========================================================
    // Apply (Review & Apply)
    //===========================================================

    [HttpPost("apply")]

    public async Task<ActionResult<ApplySystemConfigurationResultDto>> Apply(
        [FromBody] ApplySystemConfigurationChangesDto dto)
    {
        try
        {
            return Ok(
                await _repository.ApplyAsync(
                    dto,
                    this.CurrentUserId(),
                    this.CurrentUserName()));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to apply configuration changes.");

            return StatusCode(500, "Unable to apply the changes.");
        }
    }


    //===========================================================
    // Set Enabled (one switch; same rules as Apply)
    //===========================================================

    [HttpPut("{id:long}/enabled")]

    public async Task<IActionResult> SetEnabled(
        long id,
        [FromBody] SetSystemConfigurationEnabledDto dto)
    {
        try
        {
            await _repository.SetEnabledAsync(
                id,
                dto.IsEnabled,
                dto.Reason,
                this.CurrentUserId(),
                this.CurrentUserName());

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to change configuration {SystemConfigurationId}.", id);

            return StatusCode(500, "Unable to change configuration.");
        }
    }


    //===========================================================
    // Pending Requests (admin)
    //===========================================================

    [HttpGet("requests")]

    public async Task<ActionResult<List<SystemConfigurationRequestDto>>> GetRequests()
    {
        try
        {
            return Ok(
                await _repository.GetRequestsAsync(
                    this.CurrentUserId()));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load configuration requests.");

            return StatusCode(500, "Unable to load requests.");
        }
    }


    //===========================================================
    // Approve (admin)
    //===========================================================

    [HttpPost("requests/{id:long}/approve")]

    public async Task<IActionResult> Approve(
        long id,
        [FromBody] DecideSystemConfigurationRequestDto? dto)
    {
        try
        {
            await _repository.ApproveRequestAsync(
                id,
                dto?.Note ?? string.Empty,
                this.CurrentUserId(),
                this.CurrentUserName());

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to approve configuration request {RequestId}.", id);

            return StatusCode(500, "Unable to approve the request.");
        }
    }


    //===========================================================
    // Reject (admin)
    //===========================================================

    [HttpPost("requests/{id:long}/reject")]

    public async Task<IActionResult> Reject(
        long id,
        [FromBody] DecideSystemConfigurationRequestDto? dto)
    {
        try
        {
            await _repository.RejectRequestAsync(
                id,
                dto?.Note ?? string.Empty,
                this.CurrentUserId(),
                this.CurrentUserName());

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reject configuration request {RequestId}.", id);

            return StatusCode(500, "Unable to reject the request.");
        }
    }


    //===========================================================
    // Create (admin)
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        [FromBody] CreateSystemConfigurationsDto dto)
    {
        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    this.CurrentUserId(),
                    this.CurrentUserName());

            return Ok(id);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create system configuration.");

            return StatusCode(500, "Unable to save configuration.");
        }
    }


    //===========================================================
    // Update (admin)
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        [FromBody] UpdateSystemConfigurationsDto dto)
    {
        try
        {
            await _repository.UpdateAsync(
                dto,
                this.CurrentUserId(),
                this.CurrentUserName());

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update configuration {SystemConfigurationId}.", dto.SystemConfigurationId);

            return StatusCode(500, "Unable to update configuration.");
        }
    }


    //===========================================================
    // Restore (admin)
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    this.CurrentUserId(),
                    this.CurrentUserName());

            if (!restored)
            {
                return NotFound(
                    "There are no deleted configurations available to restore.");
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore system configuration.");

            return StatusCode(500, "Unable to restore configuration.");
        }
    }


    //===========================================================
    // Delete (admin)
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        try
        {
            await _repository.DeleteAsync(
                id,
                this.CurrentUserId(),
                this.CurrentUserName());

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbidden(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete configuration {SystemConfigurationId}.", id);

            return StatusCode(500, "Unable to delete configuration.");
        }
    }
}