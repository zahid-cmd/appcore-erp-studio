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
// Daily statements (read only)
//
//   GET daily-collection?from=&to=&branchId=&showCancelled=
//       every collection / refund of the period (the page adds
//       up the days, modes, lines and collectors)
//   GET invoice-profit?from=&to=&branchId=&showCancelled=
//       every posted sales invoice / return of MB, SP, AC with
//       its lines
//
// Branches : the Trial Balance list (trial-balance/branches).
// branchId 0 = all allotted branches.
// Errors : 400 with the reason (not allotted, ...), 500
//===============================================================

[ApiController]

[Route("api/accounts-finance/financial-statements")]

public class DailyStatementsController : ControllerBase
{
    private readonly IDailyStatementsRepository _repository;

    private readonly ILogger<DailyStatementsController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public DailyStatementsController(
        IDailyStatementsRepository repository,
        ILogger<DailyStatementsController> logger)
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
    // Daily Collection Statement
    //===========================================================

    [HttpGet("daily-collection")]
    public Task<IActionResult> GetDailyCollection(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled)
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(
                    await _repository.GetDailyCollectionAsync(
                        userId,
                        from,
                        to,
                        branchId,
                        showCancelled)),
            "Failed to load the daily collection.");
    }


    //===========================================================
    // Invoice-wise Daily Profit & Loss
    //===========================================================

    [HttpGet("invoice-profit")]
    public Task<IActionResult> GetInvoiceProfit(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled)
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(
                    await _repository.GetInvoiceProfitAsync(
                        userId,
                        from,
                        to,
                        branchId,
                        showCancelled)),
            "Failed to load the invoice-wise profit & loss.");
    }
}
