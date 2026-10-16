//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.POSAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// POS Accounts Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/pos-accounts")]

public class POSAccountsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IPOSAccountsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<POSAccountsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public POSAccountsController(
        IPOSAccountsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<POSAccountsController> logger)
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

    public async Task<ActionResult<List<POSAccountDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        [FromQuery] long accountSubGroupsId)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    accountSubGroupsId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<POSAccountsDefaultsDto>> GetDefaults(
        [FromQuery] long accountSubGroupsId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    accountSubGroupsId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
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

    public async Task<ActionResult<POSAccountDto>> GetById(
        long id)
    {
        POSAccountDto? posAccount =
            await _repository.GetByIdAsync(id);

        if (posAccount == null)
        {
            return NotFound(
                "POS Account not found.");
        }

        return Ok(posAccount);
    }


    //===========================================================
    // Create
    //
    // 400 : validation (terminal, linked bank, duplicates)
    // 404 : reserved sub group missing
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreatePOSAccountDto dto)
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
            _logger.LogError(ex, "Create POS Account failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to create POS Account.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdatePOSAccountDto dto)
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
            _logger.LogError(ex, "Update POS Account failed. Id: {Id}", dto.POSAccountId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to update POS Account.");
        }
    }


    //===========================================================
    // Delete
    //
    // 404 : not found / already deleted
    // 409 : in use (future: vouchers / transactions)
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
            _logger.LogError(ex, "Delete POS Account failed. Id: {Id}", id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to delete POS Account.");
        }
    }


    //===========================================================
    // Restore
    //
    // 404 : nothing to restore
    // 409 : linked bank account deleted / duplicate terminal or name
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
                    "There are no deleted POS accounts available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore POS Account failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to restore POS Account.");
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
                "POSAccount"));
    }
}