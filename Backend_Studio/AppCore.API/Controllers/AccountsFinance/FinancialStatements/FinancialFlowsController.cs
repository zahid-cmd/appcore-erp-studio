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
// Financial flows (read only)
//
//   GET cash-flows?from=&to=&branchId=&showCancelled=
//       Receipt & Payment Account and Cash Flow Statement (the
//       pages build both from the same answer)
//   GET changes-in-equity?from=&to=&branchId=&showCancelled=
//
// Branches : the Trial Balance list (trial-balance/branches).
// branchId 0 = all allotted branches.
// Errors : 400 with the reason (not allotted, ...), 500
//===============================================================

[ApiController]

[Route("api/accounts-finance/financial-statements")]

public class FinancialFlowsController : ControllerBase
{
    private readonly IFinancialFlowsRepository _repository;

    private readonly ILogger<FinancialFlowsController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public FinancialFlowsController(
        IFinancialFlowsRepository repository,
        ILogger<FinancialFlowsController> logger)
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
    // Cash flows (Receipt & Payment, Cash Flow Statement)
    //===========================================================

    [HttpGet("cash-flows")]
    public Task<IActionResult> GetCashFlows(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled)
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(
                    await _repository.GetCashFlowsAsync(
                        userId,
                        from,
                        to,
                        branchId,
                        showCancelled)),
            "Failed to load the cash flows.");
    }


    //===========================================================
    // Changes in Equity
    //===========================================================

    [HttpGet("changes-in-equity")]
    public Task<IActionResult> GetChangesInEquity(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled)
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(
                    await _repository.GetChangesInEquityAsync(
                        userId,
                        from,
                        to,
                        branchId,
                        showCancelled)),
            "Failed to load the changes in equity.");
    }
}
