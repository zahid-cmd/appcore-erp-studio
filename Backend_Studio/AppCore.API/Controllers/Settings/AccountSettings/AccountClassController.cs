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


    //===========================================================
    // Constructor
    //===========================================================

    public AccountClassController(
        IAccountClassRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
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
    //===========================================================

    [HttpGet("next-code/{classType}")]

    public async Task<ActionResult<string>> GetNextCode(
        string classType)
    {
        return Ok(
            await _repository.GetNextCodeAsync(
                classType));
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
        UpdateAccountClassDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.AccountClassId))
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
        // Verify Account Class Exists
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
                "There are no deleted account classes available to restore.");
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