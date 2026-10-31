//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.AccountsFinance.AccountingRegisters;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.AccountsFinance.AccountingRegisters;


//===============================================================
// Auto Journal Registers (read only)
//
//   GET tree?from=2026-10-01&to=2026-10-31&branchId=0
//       Module › Menu › Submenu with journal counts + branches
//   GET journals?from=&to=&branchId=&node=MNU-...
//       the journals of a node (module / menu / submenu code;
//       empty = all, OTHER = not linked to a page)
//===============================================================

[ApiController]

[Route("api/accounts-finance/accounting-registers/auto-journal-registers")]

public class AutoJournalRegistersController : ControllerBase
{
    private readonly IAutoJournalRegistersRepository _repository;

    private readonly ILogger<AutoJournalRegistersController> _logger;


    public AutoJournalRegistersController(
        IAutoJournalRegistersRepository repository,
        ILogger<AutoJournalRegistersController> logger)
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
    // Tree
    //===========================================================

    [HttpGet("tree")]
    public Task<IActionResult> GetTree(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetTreeAsync(
                        from,
                        to,
                        branchId)),
            "Failed to load the journal sources.");
    }


    //===========================================================
    // Journals of a node
    //===========================================================

    [HttpGet("journals")]
    public Task<IActionResult> GetJournals(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] string? node)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetJournalsAsync(
                        from,
                        to,
                        branchId,
                        node)),
            "Failed to load the journals.");
    }
}
