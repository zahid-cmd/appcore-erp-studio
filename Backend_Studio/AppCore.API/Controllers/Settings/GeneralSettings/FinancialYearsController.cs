//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.GeneralSettings;


//===============================================================
// Financial Years Controller
//
// Error mapping:
//   InvalidOperationException → 400 (Create / Update)
//                             → 409 (Delete / Restore)
//   KeyNotFoundException      → 404
//   Anything else             → 500 (logged)
//===============================================================

[ApiController]

[Route("api/settings/general-settings/financial-years")]

public class FinancialYearsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IFinancialYearsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<FinancialYearsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public FinancialYearsController(
        IFinancialYearsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<FinancialYearsController> logger)
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

    public async Task<ActionResult<List<FinancialYearsDto>>> GetAll()
    {
        try
        {
            return Ok(
                await _repository.GetAllAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load financial years.");

            return StatusCode(500, "Unable to load financial years.");
        }
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode()
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate financial year code.");

            return StatusCode(500, "Unable to generate financial year code.");
        }
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<FinancialYearsDefaultsDto>> GetDefaults()
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load financial year defaults.");

            return StatusCode(500, "Unable to load financial year defaults.");
        }
    }


    //===========================================================
    // Get Current
    //
    // 200 with the current year, or 204 when none is set.
    //===========================================================

    [HttpGet("current")]

    public async Task<ActionResult<FinancialYearsDto>> GetCurrent()
    {
        try
        {
            FinancialYearsDto? current =
                await _repository.GetCurrentAsync();

            if (current == null)
            {
                return NoContent();
            }

            return Ok(current);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the current financial year.");

            return StatusCode(500, "Unable to load the current financial year.");
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
                    "FinancialYear"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load financial year history.");

            return StatusCode(500, "Unable to load financial year history.");
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<FinancialYearsDto>> GetById(
        long id)
    {
        try
        {
            FinancialYearsDto? financialYear =
                await _repository.GetByIdAsync(id);

            if (financialYear == null)
            {
                return NotFound("Financial Year not found.");
            }

            return Ok(financialYear);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load financial year {FinancialYearId}.", id);

            return StatusCode(500, "Unable to load financial year.");
        }
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        [FromBody] CreateFinancialYearsDto dto)
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
            _logger.LogError(ex, "Failed to create financial year.");

            return StatusCode(500, "Unable to save financial year.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        [FromBody] UpdateFinancialYearsDto dto)
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
            _logger.LogError(ex, "Failed to update financial year {FinancialYearId}.", dto.FinancialYearId);

            return StatusCode(500, "Unable to update financial year.");
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
                    "There are no deleted financial years available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore financial year.");

            return StatusCode(500, "Unable to restore financial year.");
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
            _logger.LogError(ex, "Failed to delete financial year {FinancialYearId}.", id);

            return StatusCode(500, "Unable to delete financial year.");
        }
    }
}