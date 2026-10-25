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
// Check Reconciliations Controller
//
//   GET  /?direction=Received|Issued      checks (posted RV / PV)
//   GET  /check-history?direction=&paymentId=
//   GET  /defaults?direction=&mode=&branchId=&date=  number preview
//   GET  /deposit-accounts?branchId=      bank accounts to deposit
//   GET  /vouchers/{id}                   RRV / RRP (print)
//   GET  /deposit-slips/{id}              deposit slip (print)
//   POST /deposit                         received → Deposited
//   POST /undo-deposit
//   POST /clear                           cart → RRV / RRP
//   POST /undo-clear                      reverses the whole voucher
//   POST /dishonour                       received → Dishonoured
//   POST /undo-dishonour
//   POST /re-present                      Dishonoured → Pending
//   POST /void                            issued → Void
//   POST /undo-void
//   GET  /history                         activity
//
// 404 : not found; 409 : rule broken
//===============================================================

[ApiController]

[Route("api/accounts-finance/accounts-reconciliation/check-reconciliations")]

public class CheckReconciliationsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly ICheckReconciliationsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<CheckReconciliationsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public CheckReconciliationsController(
        ICheckReconciliationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<CheckReconciliationsController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Read
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<CheckReconciliationDto>>> GetAll(
        [FromQuery] string? direction)
    {
        return Ok(
            await _repository.GetAllAsync(direction));
    }

    [HttpGet("check-history")]

    public Task<IActionResult> GetCheckHistory(
        [FromQuery] string direction,
        [FromQuery] long paymentId)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetCheckHistoryAsync(
                        direction,
                        paymentId)),
            "Check History");
    }

    // Check Clearing Center : next number preview
    //   GET defaults?direction=Received&mode=clear&branchId=1&date=2026-10-25
    [HttpGet("defaults")]

    public async Task<ActionResult<CheckCenterDefaultsDto>> GetDefaults(
        [FromQuery] string? direction,
        [FromQuery] string? mode,
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
                : DateOnly.FromDateTime(DateTime.Now);

        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    string.IsNullOrWhiteSpace(direction) ? "Received" : direction,
                    mode ?? "clear",
                    branchId,
                    day));
        }
        catch (InvalidOperationException ex)
        {
            return Ok(new CheckCenterDefaultsDto { BranchId = branchId, Message = ex.Message });
        }
    }

    [HttpGet("deposit-accounts")]

    public async Task<ActionResult<List<CheckBankAccountDto>>> GetDepositAccounts(
        [FromQuery] long branchId)
    {
        return Ok(
            await _repository.GetDepositAccountsAsync(branchId));
    }

    [HttpGet("vouchers/{id:long}")]

    public async Task<ActionResult<CheckClearingVoucherDto>> GetVoucher(
        long id)
    {
        CheckClearingVoucherDto? item =
            await _repository.GetVoucherAsync(id);

        return item == null
            ? NotFound()
            : Ok(item);
    }

    [HttpGet("deposit-slips/{id:long}")]

    public async Task<ActionResult<CheckDepositSlipDto>> GetDepositSlip(
        long id)
    {
        CheckDepositSlipDto? item =
            await _repository.GetDepositSlipAsync(id);

        return item == null
            ? NotFound()
            : Ok(item);
    }


    //===========================================================
    // Received
    //===========================================================

    [HttpPost("deposit")]

    public Task<IActionResult> Deposit(
        CheckDepositDto dto)
    {
        return Run(
            async () => Ok(await _repository.DepositAsync(dto, UserId)),
            "Deposit Checks");
    }

    [HttpPost("undo-deposit")]

    public Task<IActionResult> UndoDeposit(
        CheckUndoDto dto)
    {
        return Run(
            async () => Ok(await _repository.UndoDepositAsync(dto, UserId)),
            "Undo Deposit");
    }

    [HttpPost("dishonour")]

    public Task<IActionResult> Dishonour(
        CheckDishonourDto dto)
    {
        return Run(
            async () => Ok(await _repository.DishonourAsync(dto, UserId)),
            "Dishonour Check");
    }

    [HttpPost("undo-dishonour")]

    public Task<IActionResult> UndoDishonour(
        CheckUndoDto dto)
    {
        return Run(
            async () => Ok(await _repository.UndoDishonourAsync(dto, UserId)),
            "Undo Dishonour");
    }

    [HttpPost("re-present")]

    public Task<IActionResult> Represent(
        CheckUndoDto dto)
    {
        return Run(
            async () => Ok(await _repository.RepresentAsync(dto, UserId)),
            "Re-present Check");
    }


    //===========================================================
    // Both
    //===========================================================

    [HttpPost("clear")]

    public Task<IActionResult> Clear(
        CheckClearDto dto)
    {
        return Run(
            async () => Ok(await _repository.ClearAsync(dto, UserId)),
            "Clear Checks");
    }

    [HttpPost("undo-clear")]

    public Task<IActionResult> UndoClear(
        CheckUndoDto dto)
    {
        return Run(
            async () => Ok(await _repository.UndoClearAsync(dto, UserId)),
            "Undo Clear");
    }


    //===========================================================
    // Issued
    //===========================================================

    [HttpPost("void")]

    public Task<IActionResult> VoidCheck(
        CheckVoidDto dto)
    {
        return Run(
            async () => Ok(await _repository.VoidAsync(dto, UserId)),
            "Void Check");
    }

    [HttpPost("undo-void")]

    public Task<IActionResult> UndoVoid(
        CheckUndoDto dto)
    {
        return Run(
            async () => Ok(await _repository.UndoVoidAsync(dto, UserId)),
            "Undo Void");
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
                "CheckReconciliations"));
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Until login identity is wired into the API
    private static long UserId => 1;

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