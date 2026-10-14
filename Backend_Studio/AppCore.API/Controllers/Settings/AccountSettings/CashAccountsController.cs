// PAGE-CLONED : Wings -> Cash Accounts
//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.CashAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// CashAccount Controller
//===============================================================

[ApiController]

[Route("api/settings/account-settings/cash-accounts")]

public class CashAccountsController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly ICashAccountsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===============================================================
    // Constructor
    //===============================================================

    public CashAccountsController(
        ICashAccountsRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<CashAccountDto>>> GetAll()
    {
        List<CashAccountDto> cashAccounts =
            await _repository.GetAllAsync();

        return Ok(cashAccounts);
    }


    //===============================================================
    // Get Next Code
    //===============================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        [FromQuery] long accountSubGroupsId)
    {
        return Ok(
            await _repository.GetNextCodeAsync(
                accountSubGroupsId));
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<CashAccountsDefaultsDto>> GetDefaults(
        [FromQuery] long accountSubGroupsId)
    {
        return Ok(
            await _repository.GetDefaultsAsync(
                accountSubGroupsId));
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<CashAccountDto>> GetById(
        long id)
    {
        CashAccountDto? cashAccount =
            await _repository.GetByIdAsync(id);

        if (cashAccount == null)
        {
            return NotFound();
        }

        return Ok(cashAccount);
    }


    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateCashAccountDto dto)
    {
        long userId = 1;

        long id =
            await _repository.CreateAsync(
                dto,
                userId);

        return Ok(id);
    }


    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateCashAccountDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.CashAccountId))
        {
            return NotFound();
        }

        long userId = 1;

        await _repository.UpdateAsync(
            dto,
            userId);

        return NoContent();
    }


    //===============================================================
    // Delete
    //===============================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        //===========================================================
        // Verify CashAccount Exists
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
            InvalidOperationException ex
        )
        {
            return Conflict(ex.Message);
        }


        //===========================================================
        // Delete Successful
        //===========================================================

        return NoContent();
    }


    //===============================================================
    // Restore
    //===============================================================

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
                "There are no deleted cashAccounts available to restore.");
        }

        return NoContent();
    }


    //===============================================================
    // Get History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Account Settings",
                "CashAccount"));
    }
}