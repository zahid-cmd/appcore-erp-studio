//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.MFSAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// MFS Accounts Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/mfs-accounts")]

public class MFSAccountsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IMFSAccountsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public MFSAccountsController(
        IMFSAccountsRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<MFSAccountDto>>> GetAll()
    {
        List<MFSAccountDto> mfsAccounts =
            await _repository.GetAllAsync();

        return Ok(mfsAccounts);
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

    public async Task<ActionResult<MFSAccountsDefaultsDto>> GetDefaults(
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

    public async Task<ActionResult<MFSAccountDto>> GetById(
        long id)
    {
        MFSAccountDto? mfsAccount =
            await _repository.GetByIdAsync(id);

        if (mfsAccount == null)
        {
            return NotFound("MFS Account not found.");
        }

        return Ok(mfsAccount);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateMFSAccountDto dto)
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
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateMFSAccountDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.MFSAccountId))
        {
            return NotFound("MFS Account not found.");
        }

           long userId = this.CurrentUserId();

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
            return NotFound("MFS Account not found.");
        }

           long userId = this.CurrentUserId();

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
            // Deletion Blocked (future: vouchers / transactions)
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
           long userId = this.CurrentUserId();

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted MFS accounts available to restore.");
            }
        }
        catch (InvalidOperationException ex)
        {
            //=======================================================
            // Restore Blocked (same provider + number active)
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
                "MFSAccount"));
    }
}