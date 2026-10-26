//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.AccountsFinance.AccountsReconciliation;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.AccountsFinance.AccountsReconciliation;


//===============================================================
// POS Reconciliations Controller
//
//   GET  /                         card receipts (posted RV)
//   GET  /line-history?paymentId=  one transaction's history
//   GET  /defaults?branchId=&date= next RRV preview
//   GET  /banks                    linked bank accounts + their
//                                  POS accounts (settlement batches)
//   GET  /vouchers/{id}            settlement / reject RRV (print)
//   GET  /auto-runs?days=          Auto Settlement log
//   POST /settle                   Pending → Settled (RRV)
//   POST /reject                   Pending / Direct → Rejected
//   POST /undo                     reverses the settlement /
//                                  reject voucher
//   POST /auto-run                 runs the nightly job now
//                                  (catch-up; safe to repeat)
//   GET  /history                  activity
//
// 404 : not found; 409 : rule broken
//===============================================================

[ApiController]

[Route("api/accounts-finance/accounts-reconciliation/pos-reconciliations")]

public class PosReconciliationsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IPosReconciliationsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<PosReconciliationsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public PosReconciliationsController(
        IPosReconciliationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<PosReconciliationsController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Read
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<PosReconciliationDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }

    [HttpGet("line-history")]

    public Task<IActionResult> GetLineHistory(
        [FromQuery] long paymentId)
    {
        return Run(
            async () => Ok(await _repository.GetHistoryAsync(paymentId)),
            "POS History");
    }

    // POS Settlement Center : next number preview
    //   GET defaults?branchId=1&date=2026-10-25
    [HttpGet("defaults")]

    public async Task<ActionResult<PosCenterDefaultsDto>> GetDefaults(
        [FromQuery] long branchId,
        [FromQuery] string? date)
    {
        DateOnly day =
            DateOnly.TryParseExact(
                date ?? string.Empty,
                "yyyy-MM-dd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out DateOnly parsed)
                ? parsed
                // Bangladesh time (UTC+6, no daylight saving)
                : DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));

        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    branchId,
                    day));
        }
        catch (InvalidOperationException ex)
        {
            return Ok(new PosCenterDefaultsDto { BranchId = branchId, Message = ex.Message });
        }
    }

    [HttpGet("banks")]

    public async Task<ActionResult<List<PosBankDto>>> GetBanks()
    {
        return Ok(
            await _repository.GetBanksAsync());
    }

    [HttpGet("vouchers/{id:long}")]

    public async Task<ActionResult<PosReconciliationVoucherDto>> GetVoucher(
        long id)
    {
        PosReconciliationVoucherDto? voucher =
            await _repository.GetVoucherAsync(id);

        return voucher == null
            ? NotFound("POS reconciliation voucher not found.")
            : Ok(voucher);
    }

    [HttpGet("auto-runs")]

    public async Task<ActionResult<List<PosAutoSettlementRunDto>>> GetAutoRuns(
        [FromQuery] int? days)
    {
        return Ok(
            await _repository.GetAutoRunsAsync(days ?? 30));
    }


    //===========================================================
    // Actions
    //===========================================================

    [HttpPost("settle")]

    public Task<IActionResult> Settle(
        PosSettleDto dto)
    {
        return Run(
            async () => Ok(await _repository.SettleAsync(dto, UserId)),
            "POS Settle");
    }

    [HttpPost("reject")]

    public Task<IActionResult> Reject(
        PosRejectDto dto)
    {
        return Run(
            async () => Ok(await _repository.RejectAsync(dto, UserId)),
            "POS Reject");
    }

    [HttpPost("undo")]

    public Task<IActionResult> Undo(
        PosUndoDto dto)
    {
        return Run(
            async () => Ok(await _repository.UndoAsync(dto, UserId)),
            "POS Undo");
    }

    // Runs the nightly job now (only what is due and not run yet)
    [HttpPost("auto-run")]

    public Task<IActionResult> AutoRun()
    {
        // Not tied to the request : a closed browser must not stop a
        // run half way
        return Run(
            async () => Ok(await _repository.RunAutoSettlementAsync(CancellationToken.None)),
            "POS Auto Settlement");
    }


    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Accounts Finance",
                "PosReconciliations"));
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Until login identity is wired into the API
    private long UserId => this.CurrentUserId();

    // InvalidOperationException → 409; KeyNotFoundException → 404
    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> work,
        string action
    )
    {
        try
        {
            return await work();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            // A broken rule (logged : EF also throws this type)
            _logger.LogWarning("{Action} refused : {Message}", action, ex.Message);

            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Action} failed.", action);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                $"{action} failed.");
        }
    }
}