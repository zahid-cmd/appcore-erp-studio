//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.AccountsFinance.FinancialStatements;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.AccountsFinance.FinancialStatements;


//===============================================================
// Final Accounts (read only) : Profit & Loss, Balance Sheet
//
//   GET year?date=
//       the financial year that holds the date (filter defaults)
//   GET profit-loss?from=&to=&branchId=&showCancelled=&compare=
//       compare : none / last-year / previous
//   GET balance-sheet?asOn=&branchId=&showCancelled=&compare=
//       compare : none / last-year / year-end
//
// Branches : the Trial Balance list (trial-balance/branches).
// branchId 0 = all allotted branches.
// Errors : 400 with the reason (not allotted, ...), 500
//===============================================================

[ApiController]

[Route("api/accounts-finance/financial-statements")]

public class FinalAccountsController : ControllerBase
{
    private readonly IFinalAccountsRepository _repository;

    private readonly ILogger<FinalAccountsController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public FinalAccountsController(
        IFinalAccountsRepository repository,
        ILogger<FinalAccountsController> logger)
    {
        _repository = repository;

        _logger = logger;
    }


    //===========================================================
    // Run with the standard error answers
    //===========================================================

    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> action,
        string failure
    )
    {
        try
        {
            return await action();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Failure}", failure);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                failure);
        }
    }


    //===========================================================
    // Financial year of a date
    //===========================================================

    [HttpGet("year")]
    public Task<IActionResult> GetYear(
        [FromQuery] string? date)
    {
        return Run(
            async () =>
                Ok(await _repository.GetYearAsync(date)),
            "Failed to load the financial year.");
    }


    //===========================================================
    // Profit & Loss
    //===========================================================

    [HttpGet("profit-loss")]
    public Task<IActionResult> GetProfitLoss(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled,
        [FromQuery] string? compare)
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(
                    await _repository.GetProfitLossAsync(
                        userId,
                        from,
                        to,
                        branchId,
                        showCancelled,
                        compare)),
            "Failed to load the profit & loss account.");
    }


    //===========================================================
    // Balance Sheet
    //===========================================================

    [HttpGet("balance-sheet")]
    public Task<IActionResult> GetBalanceSheet(
        [FromQuery] string? asOn,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled,
        [FromQuery] string? compare)
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(
                    await _repository.GetBalanceSheetAsync(
                        userId,
                        asOn,
                        branchId,
                        showCancelled,
                        compare)),
            "Failed to load the balance sheet.");
    }
}
