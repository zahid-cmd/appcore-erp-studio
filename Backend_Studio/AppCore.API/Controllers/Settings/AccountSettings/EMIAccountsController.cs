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
// EMI Accounts Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/emi-accounts")]

public class EmiAccountsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IEmiAccountsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<EmiAccountsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public EmiAccountsController(
        IEmiAccountsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<EmiAccountsController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<EmiAccountsDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults (reserved sub group + next code)
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<EmiAccountsDefaultsDto>> GetDefaults()
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

    public async Task<ActionResult<EmiAccountsDto>> GetById(
        long id)
    {
        EmiAccountsDto? item =
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
        CreateEmiAccountsDto dto)
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
            _logger.LogError(ex, "Create EMI Account failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to create EMI Account.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateEmiAccountsDto dto)
    {
        long userId = 1;

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
            _logger.LogError(ex, "Update EMI Account failed. Id: {Id}", dto.EmiAccountId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to update EMI Account.");
        }
    }


    //===========================================================
    // Delete
    //
    // 404 : not found / already deleted
    // 409 : in use (future: vouchers / reconciliation)
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
            _logger.LogError(ex, "Delete EMI Account failed. Id: {Id}", id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to delete EMI Account.");
        }
    }


    //===========================================================
    // Restore (most recently deleted)
    //
    // 404 : nothing to restore
    // 409 : card / linked bank deleted, or duplicate
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
                    "There are no deleted EMI accounts available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore EMI Account failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to restore EMI Account.");
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
                "EmiAccount"));
    }
}