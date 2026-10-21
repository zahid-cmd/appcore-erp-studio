//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AutoAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Auto Accounts Controller (read-only)
//
// GET codes   codes of the auto-created groups / sub groups /
//             ledgers (Inventory and Financial)
//
// Used by the Account Group, Account Sub Group and General
// Ledger list pages to split their three tabs. Never cached.
//===============================================================

[ApiController]

[Route("api/settings/account-settings/auto-accounts")]

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

public class AutoAccountsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IAutoAccountsRepository _repository;

    private readonly ILogger<AutoAccountsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public AutoAccountsController(
        IAutoAccountsRepository repository,
        ILogger<AutoAccountsController> logger)
    {
        _repository =
            repository;

        _logger =
            logger;
    }


    //===========================================================
    // Get Codes
    //===========================================================

    [HttpGet("codes")]

    public async Task<ActionResult<AutoAccountCodesDto>> GetCodes()
    {
        try
        {
            return Ok(
                await _repository.GetCodesAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the auto account codes.");

            return StatusCode(500, $"Unable to load the auto account codes. {ex.GetBaseException().Message}");
        }
    }
}