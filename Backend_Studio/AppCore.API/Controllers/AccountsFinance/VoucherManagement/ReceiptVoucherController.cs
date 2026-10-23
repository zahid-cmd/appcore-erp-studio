//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.AccountsFinance.VoucherManagement;


//===============================================================
// Receipt Voucher Controller
//
//   GET    /                    list
//   GET    /{id}                header + debits + credits
//   POST   /                    create Draft (returns id + number)
//   PUT    /                    update Draft
//   DELETE /{id}                delete Draft
//   PUT    /restore             restore last deleted Draft
//   PUT    /{id}/approve        Draft → Approved
//   PUT    /{id}/return-to-draft Approved → Draft
//   PUT    /{id}/post           Approved → Posted
//   PUT    /{id}/cancel         Posted → Cancelled (reason)
//   GET    /history
//
// 400 : validation; 404 : not found; 409 : wrong status / blocked
//===============================================================

[ApiController]

[Route("api/accounts-finance/voucher-management/receipt-voucher")]

public class ReceiptVoucherController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IReceiptVoucherRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<ReceiptVoucherController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public ReceiptVoucherController(
        IReceiptVoucherRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<ReceiptVoucherController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Read
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ReceiptVoucherDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }

    [HttpGet("{id:long}")]

    public async Task<ActionResult<ReceiptVoucherDto>> GetById(
        long id)
    {
        ReceiptVoucherDto? item =
            await _repository.GetByIdAsync(id);

        return item == null
            ? NotFound()
            : Ok(item);
    }


    //===========================================================
    // Create / Update (Draft)
    //===========================================================

    [HttpPost]

    public Task<IActionResult> Create(
        CreateReceiptVoucherDto dto)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.CreateAsync(
                        dto,
                        UserId)),
            "Create Receipt Voucher",
            badRequestOnInvalid: true);
    }

    [HttpPut]

    public Task<IActionResult> Update(
        UpdateReceiptVoucherDto dto)
    {
        return Run(
            async () =>
            {
                await _repository.UpdateAsync(
                    dto,
                    UserId);

                return NoContent();
            },
            "Update Receipt Voucher",
            badRequestOnInvalid: true);
    }


    //===========================================================
    // Delete / Restore (Draft)
    //===========================================================

    [HttpDelete("{id:long}")]

    public Task<IActionResult> Delete(
        long id)
    {
        return Run(
            async () =>
            {
                await _repository.DeleteAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Delete Receipt Voucher");
    }

    [HttpPut("restore")]

    public Task<IActionResult> Restore()
    {
        return Run(
            async () =>
                await _repository.RestoreAsync(UserId)
                    ? NoContent()
                    : NotFound("There are no deleted receipt vouchers available to restore."),
            "Restore Receipt Voucher");
    }


    //===========================================================
    // Workflow
    //===========================================================

    [HttpPut("{id:long}/approve")]

    public Task<IActionResult> Approve(
        long id)
    {
        return Run(
            async () =>
            {
                await _repository.ApproveAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Approve Receipt Voucher");
    }

    [HttpPut("{id:long}/return-to-draft")]

    public Task<IActionResult> ReturnToDraft(
        long id)
    {
        return Run(
            async () =>
            {
                await _repository.ReturnToDraftAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Return Receipt Voucher To Draft");
    }

    [HttpPut("{id:long}/post")]

    public Task<IActionResult> Post(
        long id)
    {
        return Run(
            async () =>
            {
                await _repository.PostAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Post Receipt Voucher");
    }

    [HttpPut("{id:long}/cancel")]

    public Task<IActionResult> Cancel(
        long id,
        CancelReceiptVoucherDto dto)
    {
        return Run(
            async () =>
            {
                await _repository.CancelAsync(
                    id,
                    dto,
                    UserId);

                return NoContent();
            },
            "Cancel Receipt Voucher");
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
                "ReceiptVoucher"));
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Until login identity is wired into the API
    private static long UserId => 1;

    // InvalidOperationException → 400 (create / update) or 409
    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> work,
        string action,
        bool badRequestOnInvalid = false
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
            return badRequestOnInvalid
                ? BadRequest(ex.Message)
                : Conflict(ex.Message);
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