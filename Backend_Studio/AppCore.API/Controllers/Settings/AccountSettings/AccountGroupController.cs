//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AccountGroup.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Account Group Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/account-group")]

public class AccountGroupController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IAccountGroupRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<AccountGroupController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public AccountGroupController(
        IAccountGroupRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<AccountGroupController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<AccountGroupDto>>> GetAll()
    {
        List<AccountGroupDto> accountGroups =
            await _repository.GetAllAsync();

        return Ok(accountGroups);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code/{accountClassId:long}")]

    public async Task<ActionResult<string>> GetNextCode(
        long accountClassId)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    accountClassId));
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

    public async Task<ActionResult<AccountGroupDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<AccountGroupDto>> GetById(
        long id)
    {
        AccountGroupDto? accountGroup =
            await _repository.GetByIdAsync(id);

        if (accountGroup == null)
        {
            return NotFound();
        }

        return Ok(accountGroup);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateAccountGroupDto dto)
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
                "Account Group create failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Account Group could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateAccountGroupDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.AccountGroupId))
        {
            return NotFound();
        }

           long userId = this.CurrentUserId();

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
                "Account Group update failed. Id {AccountGroupId}",
                dto.AccountGroupId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Account Group could not be updated. Please try again.");
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
        // Verify Account Group Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }


        //===========================================================
        // Current User
        //===========================================================

           long userId = this.CurrentUserId();


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
            //=======================================================
            // Deletion Blocked
            //
            // Raised by the repository when Account Sub Groups still
            // exist under this Account Group. Returned as HTTP 409
            // with a plain-text message, which the list page shows
            // in its "Delete Blocked" toast.
            //=======================================================

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
           long userId = this.CurrentUserId();

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
            // Its class is deleted, or its name / code is taken.
            //=======================================================

            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted account groups available to restore.");
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
                "Account Group"));
    }
}