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
// Error mapping:
//   InvalidOperationException → 400 (Create / Update / Enable)
//                             → 409 (Delete / Restore)
//   KeyNotFoundException      → 404
//   Anything else             → 500 (logged)
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
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<SystemConfigurationsDto>>> GetAll()
    {
        try
        {
            return Ok(
                await _repository.GetAllAsync());
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
            return Ok(
                await _activityHistoryRepository.GetListHistoryAsync(
                    "General Settings",
                    "SystemConfiguration"));
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
                await _repository.GetByIdAsync(id);

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
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        [FromBody] CreateSystemConfigurationsDto dto)
    {
        long userId = 1;

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            return Ok(id);
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
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        [FromBody] UpdateSystemConfigurationsDto dto)
    {
        long userId = 1;

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
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
    // Set Enabled (on/off switch)
    //===========================================================

    [HttpPut("{id:long}/enabled")]

    public async Task<IActionResult> SetEnabled(
        long id,
        [FromBody] SetSystemConfigurationEnabledDto dto)
    {
        long userId = 1;

        try
        {
            await _repository.SetEnabledAsync(
                id,
                dto.IsEnabled,
                userId);

            return NoContent();
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
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted configurations available to restore.");
            }

            return NoContent();
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
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        long userId = 1;

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);

            return NoContent();
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