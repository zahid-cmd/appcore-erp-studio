//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.BankSetup.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Bank Setup Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/bank-setup")]

public class BankSetupController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IBankSetupRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<BankSetupController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public BankSetupController(
        IBankSetupRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<BankSetupController> logger)
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

    public async Task<ActionResult<List<BankSetupDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode()
    {
        return Ok(
            await _repository.GetNextCodeAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<BankSetupDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<BankSetupDto>> GetById(
        long id)
    {
        BankSetupDto? bankSetup =
            await _repository.GetByIdAsync(id);

        if (bankSetup == null)
        {
            return NotFound(
                "Bank Setup not found.");
        }

        return Ok(bankSetup);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateBankSetupDto dto)
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create Bank Setup failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to create Bank Setup.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateBankSetupDto dto)
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
            _logger.LogError(ex, "Update Bank Setup failed. Id: {Id}", dto.BankSetupId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to update Bank Setup.");
        }
    }


    //===========================================================
    // Delete
    //
    // 404 : not found / already deleted
    // 409 : used by Bank Accounts / Card Setup / MFS Accounts
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
            _logger.LogError(ex, "Delete Bank Setup failed. Id: {Id}", id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to delete Bank Setup.");
        }
    }


    //===========================================================
    // Restore
    //
    // 404 : nothing to restore
    // 409 : duplicate Bank Name / Bank Code
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
                    "There is no deleted Bank Setup available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore Bank Setup failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Failed to restore Bank Setup.");
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
                "BankSetup"));
    }
}