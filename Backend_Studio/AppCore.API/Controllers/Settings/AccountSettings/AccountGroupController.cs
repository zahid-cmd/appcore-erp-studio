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


    //===========================================================
    // Constructor
    //===========================================================

    public AccountGroupController(
        IAccountGroupRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
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
        return Ok(
            await _repository.GetNextCodeAsync(
                accountClassId));
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
        long userId = 1;

        long id =
            await _repository.CreateAsync(
                dto,
                userId);

        return Ok(id);
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

        long userId = 1;

        await _repository.UpdateAsync(
            dto,
            userId);

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

        bool restored =
            await _repository.RestoreAsync(
                userId);

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