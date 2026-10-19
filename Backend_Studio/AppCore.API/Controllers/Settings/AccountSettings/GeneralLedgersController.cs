//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.GeneralLedgers.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// General Ledgers Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/general-ledger")]

public class GeneralLedgersController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IGeneralLedgersRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<GeneralLedgersController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public GeneralLedgersController(
        IGeneralLedgersRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<GeneralLedgersController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<GeneralLedgersDto>>> GetAll()
    {
        List<GeneralLedgersDto> generalLedgers =
            await _repository.GetAllAsync();

        return Ok(generalLedgers);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code/{accountSubGroupId:long}")]

    public async Task<ActionResult<string>> GetNextCode(
        long accountSubGroupId)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    accountSubGroupId));
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<GeneralLedgersDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<GeneralLedgersDto>> GetById(
        long id)
    {
        GeneralLedgersDto? generalLedger =
            await _repository.GetByIdAsync(id);

        if (generalLedger == null)
        {
            return NotFound();
        }

        return Ok(generalLedger);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateGeneralLedgersDto dto)
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
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
        catch
        (
            Exception ex
        )
        {
            _logger.LogError(
                ex,
                "General Ledger create failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "General Ledger could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateGeneralLedgersDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.GeneralLedgerId))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
        catch
        (
            Exception ex
        )
        {
            _logger.LogError(
                ex,
                "General Ledger update failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "General Ledger could not be updated. Please try again.");
        }

        return NoContent();
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        //===========================================================
        // Verify General Ledger Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }


        //===========================================================
        // Current User
        //===========================================================

        long userId = 1;


        //===========================================================
        // Delete
        //===========================================================

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            // Deletion blocked : returned as 409 for the list page
            return Conflict(ex.Message);
        }


        //===========================================================
        // Delete Successful
        //===========================================================

        return NoContent();
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        bool restored;

        try
        {
            restored =
                await _repository.RestoreAsync(
                    userId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            //=======================================================
            // Restore Blocked
            //
            // Its sub group / group / class is deleted, or its
            // name / code is taken.
            //=======================================================

            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted general ledgers available to restore.");
        }

        return NoContent();
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
                "General Ledger"));
    }
}