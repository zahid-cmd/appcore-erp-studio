//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Chart of Accounts Controller (read-only)
//
// GET tree                      Class → Group → Sub Group + counts
// GET sub-groups/{id}/ledgers   ledgers of one sub group
// GET ledgers                   all ledgers (printing)
// GET issues                    broken / inconsistent links
//
// Responses are never cached, so the page always shows the
// current data of the account setting pages.
//===============================================================

[ApiController]

[Route("api/settings/account-settings/chart-of-accounts")]

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

public class ChartOfAccountsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IChartOfAccountsRepository _repository;

    private readonly ILogger<ChartOfAccountsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public ChartOfAccountsController(
        IChartOfAccountsRepository repository,
        ILogger<ChartOfAccountsController> logger)
    {
        _repository =
            repository;

        _logger =
            logger;
    }


    //===========================================================
    // Get Tree
    //===========================================================

    [HttpGet("tree")]

    public async Task<ActionResult<List<ChartOfAccountsClassDto>>> GetTree()
    {
        try
        {
            return Ok(
                await _repository.GetTreeAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the chart of accounts tree.");

            return StatusCode(500, "Unable to load the chart of accounts.");
        }
    }


    //===========================================================
    // Get Sub Group Ledgers
    //===========================================================

    [HttpGet("sub-groups/{subGroupId:long}/ledgers")]

    public async Task<ActionResult<List<ChartOfAccountsDto>>> GetSubGroupLedgers(
        long subGroupId)
    {
        try
        {
            if (!await _repository.SubGroupExistsAsync(subGroupId))
            {
                return NotFound("Account Sub Group not found.");
            }

            return Ok(
                await _repository.GetSubGroupLedgersAsync(
                    subGroupId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load ledgers for sub group {SubGroupId}.", subGroupId);

            return StatusCode(500, "Unable to load ledgers.");
        }
    }


    //===========================================================
    // Get All Ledgers (printing)
    //===========================================================

    [HttpGet("ledgers")]

    public async Task<ActionResult<List<ChartOfAccountsDto>>> GetAllLedgers()
    {
        try
        {
            return Ok(
                await _repository.GetAllLedgersAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load all ledgers.");

            return StatusCode(500, "Unable to load ledgers.");
        }
    }


    //===========================================================
    // Get Link Issues
    //===========================================================

    [HttpGet("issues")]

    public async Task<ActionResult<List<ChartOfAccountsIssueDto>>> GetIssues()
    {
        try
        {
            return Ok(
                await _repository.GetIssuesAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check chart of accounts links.");

            return StatusCode(500, "Unable to check the chart of accounts.");
        }
    }
}