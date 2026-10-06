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


    //===========================================================
    // Constructor
    //===========================================================

    public AccountSubGroupController(
        IAccountSubGroupRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
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
        return Ok(
            await _repository.GetNextCodeAsync(
                accountGroupId));
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
        UpdateAccountSubGroupDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.AccountSubGroupId))
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
        // Verify Account Sub Group Exists
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