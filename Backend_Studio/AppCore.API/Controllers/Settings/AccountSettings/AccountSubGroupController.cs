//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AccountSubGroup.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Account Sub Group Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/account-sub-group")]

public class AccountSubGroupController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IAccountSubGroupRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<AccountSubGroupController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public AccountSubGroupController(
        IAccountSubGroupRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<AccountSubGroupController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<AccountSubGroupDto>>> GetAll()
    {
        List<AccountSubGroupDto> accountSubGroups =
            await _repository.GetAllAsync();

        return Ok(accountSubGroups);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code/{accountGroupId:long}")]

    public async Task<ActionResult<string>> GetNextCode(
        long accountGroupId)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    accountGroupId));
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

    public async Task<ActionResult<AccountSubGroupDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<AccountSubGroupDto>> GetById(
        long id)
    {
        AccountSubGroupDto? accountSubGroup =
            await _repository.GetByIdAsync(id);

        if (accountSubGroup == null)
        {
            return NotFound();
        }

        return Ok(accountSubGroup);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateAccountSubGroupDto dto)
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
                "Account Sub Group create failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Account Sub Group could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateAccountSubGroupDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.AccountSubGroupId))
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
                "Account Sub Group update failed. Id {AccountSubGroupId}",
                dto.AccountSubGroupId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Account Sub Group could not be updated. Please try again.");
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
        // Verify Account Sub Group Exists
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
            // Raised by the repository when General Ledgers,
            // Cash Accounts or Bank Accounts still use this
            // Account Sub Group. Returned as HTTP 409 with a
            // plain-text message for the "Delete Blocked" toast.
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
            // Its group / class is deleted, or its name / code is
            // taken.
            //=======================================================

            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted account sub groups available to restore.");
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
                "Account Sub Group"));
    }
}