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
// Trial Balance (read only)
//
//   GET branches
//       the branches the logged-in user is allotted to
//   GET ''?from=&to=&branchId=&showCancelled=
//       one row per ledger : opening, period Dr / Cr, closing
//       (branchId 0 = all allotted branches)
//
// Errors : 400 with the reason (not allotted, ...), 500
//===============================================================

[ApiController]

[Route("api/accounts-finance/financial-statements/trial-balance")]

public class TrialBalanceController : ControllerBase
{
    private readonly ITrialBalanceRepository _repository;

    private readonly ILogger<TrialBalanceController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public TrialBalanceController(
        ITrialBalanceRepository repository,
        ILogger<TrialBalanceController> logger)
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
    // Allotted branches (filter list)
    //===========================================================

    [HttpGet("branches")]
    public Task<IActionResult> GetBranches()
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(await _repository.GetBranchesAsync(userId)),
            "Failed to load the branches.");
    }


    //===========================================================
    // Trial Balance
    //===========================================================

    [HttpGet]
    public Task<IActionResult> Get(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled)
    {
        long userId = UserId;

        return Run(
            async () =>
                Ok(
                    await _repository.GetTrialBalanceAsync(
                        userId,
                        from,
                        to,
                        branchId,
                        showCancelled)),
            "Failed to load the trial balance.");
    }
}
