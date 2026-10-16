// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.BankAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// BankAccount Controller
//
// Error mapping:
//   InvalidOperationException → 400 (Create / Update)
//                             → 409 (Delete / Restore)
//   KeyNotFoundException      → 404
//   Anything else             → 500 (logged)
//===============================================================

[ApiController]

[Route("api/settings/account-settings/bank-accounts")]

public class BankAccountsController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly IBankAccountsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<BankAccountsController> _logger;


    //===============================================================
    // Constructor
    //===============================================================

    public BankAccountsController(
        IBankAccountsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<BankAccountsController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<BankAccountDto>>> GetAll()
    {
        try
        {
            List<BankAccountDto> bankAccounts =
                await _repository.GetAllAsync();

            return Ok(bankAccounts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load bank accounts.");

            return StatusCode(500, "Unable to load bank accounts.");
        }
    }


    //===============================================================
    // Get Next Code
    //===============================================================

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
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate bank account code for sub group {AccountSubGroupsId}.", accountSubGroupsId);

            return StatusCode(500, "Unable to generate bank account code.");
        }
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<BankAccountsDefaultsDto>> GetDefaults(
        [FromQuery] long accountSubGroupsId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    accountSubGroupsId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load bank account defaults for sub group {AccountSubGroupsId}.", accountSubGroupsId);

            return StatusCode(500, "Unable to load bank account defaults.");
        }
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<BankAccountDto>> GetById(
        long id)
    {
        try
        {
            BankAccountDto? bankAccount =
                await _repository.GetByIdAsync(id);

            if (bankAccount == null)
            {
                return NotFound("Bank Account not found.");
            }

            return Ok(bankAccount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load bank account {BankAccountId}.", id);

            return StatusCode(500, "Unable to load bank account.");
        }
    }


    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateBankAccountDto dto)
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create bank account.");

            return StatusCode(500, "Unable to save bank account.");
        }
    }


    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateBankAccountDto dto)
    {
        long userId = 1;

        try
        {
            if (!await _repository.ExistsAsync(
                    dto.BankAccountId))
            {
                return NotFound("Bank Account not found.");
            }

            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update bank account {BankAccountId}.", dto.BankAccountId);

            return StatusCode(500, "Unable to update bank account.");
        }
    }


    //===============================================================
    // Delete
    //
    // 409 while MFS / POS Accounts are linked to it.
    //===============================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        long userId = 1;

        try
        {
            if (!await _repository.ExistsAsync(id))
            {
                return NotFound("Bank Account not found.");
            }

            await _repository.DeleteAsync(
                id,
                userId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete bank account {BankAccountId}.", id);

            return StatusCode(500, "Unable to delete bank account.");
        }
    }


    //===============================================================
    // Restore
    //
    // 409 when the bank was deleted or a duplicate exists.
    //===============================================================

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
                    "There are no deleted bank accounts available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore bank account.");

            return StatusCode(500, "Unable to restore bank account.");
        }
    }


    //===============================================================
    // Get History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        try
        {
            return Ok(
                await _activityHistoryRepository.GetListHistoryAsync(
                    "Account Settings",
                    "BankAccount"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load bank account history.");

            return StatusCode(500, "Unable to load bank account history.");
        }
    }
}