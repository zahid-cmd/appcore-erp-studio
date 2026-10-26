//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Settings.AccountSettings;


//===============================================================
// EMI Reimbursement Schemes Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/emi-reimbursement-schemes")]

public class EmiReimbursementSchemesController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IEmiReimbursementSchemesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<EmiReimbursementSchemesController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public EmiReimbursementSchemesController(
        IEmiReimbursementSchemesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<EmiReimbursementSchemesController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<EmiReimbursementSchemesDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults (next code, brands, tenures)
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<EmiReimbursementSchemesDefaultsDto>> GetDefaults()
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<EmiReimbursementSchemesDto>> GetById(
        long id)
    {
        EmiReimbursementSchemesDto? item =
            await _repository.GetByIdAsync(id);

        if (item == null)
        {
            return NotFound();
        }

        return Ok(item);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateEmiReimbursementSchemesDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            return Ok(id);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create EMI Reimbursement Scheme failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to create EMI Reimbursement Scheme.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateEmiReimbursementSchemesDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Update EMI Reimbursement Scheme failed. Id: {Id}", dto.EmiReimbursementSchemeId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to update EMI Reimbursement Scheme.");
        }
    }


    //===========================================================
    // Delete
    //
    // 404 : not found / already deleted
    // 409 : in use (future : EMI claims)
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
           long userId = this.CurrentUserId();

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Delete EMI Reimbursement Scheme failed. Id: {Id}", id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to delete EMI Reimbursement Scheme.");
        }
    }


    //===========================================================
    // Restore (most recently deleted)
    //
    // 404 : nothing to restore
    // 409 : brand deleted, or overlaps a live scheme
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
           long userId = this.CurrentUserId();

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted EMI reimbursement schemes available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore EMI Reimbursement Scheme failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to restore EMI Reimbursement Scheme.");
        }
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Account Settings",
                "EmiReimbursementScheme"));
    }
}