//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AccountClass.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Account Class Controller
//
// Errors : 400 invalid input (Create / Update / next-code)
//          404 not found
//          409 Delete / Restore blocked (plain text)
//===============================================================

[ApiController]

[Route("api/settings/account-settings/account-class")]

public class AccountClassController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IAccountClassRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<AccountClassController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public AccountClassController(
        IAccountClassRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<AccountClassController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<AccountClassDto>>> GetAll()
    {
        List<AccountClassDto> accountClasses =
            await _repository.GetAllAsync();

        return Ok(accountClasses);
    }


    //===========================================================
    // Get Next Code
    //
    // GET next-code?classType=Account%20Class&classPrefix=CLS
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        [FromQuery] string classType,
        [FromQuery] string classPrefix)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    classType,
                    classPrefix));
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

    public async Task<ActionResult<AccountClassDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<AccountClassDto>> GetById(
        long id)
    {
        AccountClassDto? accountClass =
            await _repository.GetByIdAsync(id);

        if (accountClass == null)
        {
            return NotFound();
        }

        return Ok(accountClass);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateAccountClassDto dto)
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
            _logger.LogError(ex, "Create Account Class failed.");

            return StatusCode(500, "Unable to create the account class.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateAccountClassDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.AccountClassId))
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
            _logger.LogError(ex, "Update Account Class {Id} failed.", dto.AccountClassId);

            return StatusCode(500, "Unable to update the account class.");
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
        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            //=======================================================
            // Delete Blocked : account groups still exist
            //=======================================================

            return Conflict(ex.Message);
        }

        return NoContent();
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
                    "There are no deleted account classes available to restore.");
            }
        }
        catch (InvalidOperationException ex)
        {
            //=======================================================
            // Restore Blocked : name / code / prefix in use
            //=======================================================

            return Conflict(ex.Message);
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
                "Account Class"));
    }
}