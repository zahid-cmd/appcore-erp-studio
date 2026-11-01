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
// Ledger Statements and Registers (read only)
//
//   GET chart?type=bank
//       classes / groups / sub groups / ledgers of the type +
//       branches (the filter lists)
//   GET statement?type=&ledger=&from=&to=&branchId=&showCancelled=
//       one ledger : opening, rows, running balance, closing
//   GET summary?type=&classCode=&groupCode=&subGroupCode=&from=&to=&branchId=&showCancelled=
//       one row per ledger of the class / group / sub group
//   GET voucher?voucherType=&voucherNo=
//       one voucher's lines (opened under a statement row)
//
// type : general-ledger / cash / bank / mfs / pos / emi
//===============================================================

[ApiController]

[Route("api/accounts-finance/accounting-registers/ledger-registers")]

public class LedgerRegistersController : ControllerBase
{
    private readonly ILedgerRegistersRepository _repository;

    private readonly ILogger<LedgerRegistersController> _logger;


    public LedgerRegistersController(
        ILedgerRegistersRepository repository,
        ILogger<LedgerRegistersController> logger)
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
    // Chart (filter lists)
    //===========================================================

    [HttpGet("chart")]
    public Task<IActionResult> GetChart(
        [FromQuery] string? type)
    {
        return Run(
            async () =>
                Ok(await _repository.GetChartAsync(type)),
            "Failed to load the ledgers.");
    }


    //===========================================================
    // Statement of one ledger
    //===========================================================

    [HttpGet("statement")]
    public Task<IActionResult> GetStatement(
        [FromQuery] string? type,
        [FromQuery] string? ledger,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetStatementAsync(
                        type,
                        ledger,
                        from,
                        to,
                        branchId,
                        showCancelled)),
            "Failed to load the statement.");
    }


    //===========================================================
    // Summary of a class / group / sub group
    //===========================================================

    [HttpGet("summary")]
    public Task<IActionResult> GetSummary(
        [FromQuery] string? type,
        [FromQuery] string? classCode,
        [FromQuery] string? groupCode,
        [FromQuery] string? subGroupCode,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] bool showCancelled)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetSummaryAsync(
                        type,
                        classCode,
                        groupCode,
                        subGroupCode,
                        from,
                        to,
                        branchId,
                        showCancelled)),
            "Failed to load the summary.");
    }


    //===========================================================
    // One voucher
    //===========================================================

    [HttpGet("voucher")]
    public Task<IActionResult> GetVoucher(
        [FromQuery] string? voucherType,
        [FromQuery] string? voucherNo)
    {
        return Run(
            async () =>
            {
                LedgerVoucherDto? voucher =
                    await _repository.GetVoucherAsync(
                        voucherType,
                        voucherNo);

                return voucher == null
                    ? NotFound("Voucher not found.")
                    : Ok(voucher);
            },
            "Failed to load the voucher.");
    }
}
