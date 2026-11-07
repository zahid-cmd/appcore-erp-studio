//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.Paging;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.AccountsFinance.VoucherManagement;


//===============================================================
// Payment Voucher Controller
//
//   GET    /                    list
//   GET    /paged               the list page (one page, server side)
//   GET    /defaults            next voucher number (preview)
//   GET    /{publicId}          header + debits + credits
//   POST   /                    create Draft (returns id + number)
//   PUT    /{publicId}          update Draft
//   DELETE /{publicId}          delete Draft
//   PUT    /restore             restore last deleted Draft
//   PUT    /{publicId}/approve  Draft → Approved
//   PUT    /{publicId}/return-to-draft Approved → Draft
//   PUT    /{publicId}/post     Approved → Posted
//   PUT    /{publicId}/cancel   Posted → Cancelled (reason)
//   GET    /history
//
// 400 : validation; 404 : not found; 409 : wrong status / blocked
//===============================================================

[ApiController]

[Route("api/accounts-finance/voucher-management/payment-voucher")]

public class PaymentVoucherController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IPaymentVoucherRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<PaymentVoucherController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public PaymentVoucherController(
        IPaymentVoucherRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<PaymentVoucherController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Read
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<PaymentVoucherDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Paged (the list page)
    //===========================================================

    [HttpGet("paged")]
    public async Task<ActionResult<PagedResult<PaymentVoucherDto>>> GetPaged(
        [FromQuery] VoucherPageRequest request)
    {
        return Ok(
            await _repository.GetPagedAsync(
                request ?? new VoucherPageRequest()));
    }

    //===========================================================
    // Defaults (Add form) : next voucher number for branch + date
    //   GET defaults?branchId=1&date=2026-10-22
    // Always 200; Message tells why there is no number.
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<PaymentVoucherDefaultsDto>> GetDefaults(
        [FromQuery] long branchId,
        [FromQuery] string? date)
    {
        DateOnly voucherDate =
            DateOnly.TryParseExact(
                date ?? string.Empty,
                "yyyy-MM-dd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out DateOnly parsed)
                ? parsed
                : BusinessToday();

        return Ok(
            await _repository.GetDefaultsAsync(
                branchId,
                voucherDate));
    }


    // Internal id : the print documents of the reconciliation
    // pages load a source voucher by it (not used in links)
    [HttpGet("by-id/{id:long}")]

    public async Task<ActionResult<PaymentVoucherDto>> GetByInternalId(
        long id)
    {
        PaymentVoucherDto? found =
            await _repository.GetByIdAsync(id);

        return found == null
            ? NotFound()
            : Ok(found);
    }


    [HttpGet("{publicId:guid}")]

    public async Task<ActionResult<PaymentVoucherDto>> GetById(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        PaymentVoucherDto? item =
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
        CreatePaymentVoucherDto dto)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.CreateAsync(
                        dto,
                        UserId)),
            "Create Payment Voucher",
            badRequestOnInvalid: true);
    }

    [HttpPut("{publicId:guid}")]

    public async Task<IActionResult> Update(
        Guid publicId,
        UpdatePaymentVoucherDto dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        // The server decides which voucher : never the body
        dto.PaymentVoucherId =
            id;

        return await Run(
            async () =>
            {
                await _repository.UpdateAsync(
                    dto,
                    UserId);

                return NoContent();
            },
            "Update Payment Voucher",
            badRequestOnInvalid: true);
    }


    //===========================================================
    // Delete / Restore (Draft)
    //===========================================================

    [HttpDelete("{publicId:guid}")]

    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        return await Run(
            async () =>
            {
                await _repository.DeleteAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Delete Payment Voucher");
    }

    [HttpPut("restore")]

    public Task<IActionResult> Restore()
    {
        return Run(
            async () =>
                await _repository.RestoreAsync(UserId)
                    ? NoContent()
                    : NotFound("There are no deleted payment vouchers available to restore."),
            "Restore Payment Voucher");
    }


    //===========================================================
    // Workflow
    //===========================================================

    [HttpPut("{publicId:guid}/approve")]

    public async Task<IActionResult> Approve(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        return await Run(
            async () =>
            {
                await _repository.ApproveAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Approve Payment Voucher");
    }

    [HttpPut("{publicId:guid}/return-to-draft")]

    public async Task<IActionResult> ReturnToDraft(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        return await Run(
            async () =>
            {
                await _repository.ReturnToDraftAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Return Payment Voucher To Draft");
    }

    [HttpPut("{publicId:guid}/post")]

    public async Task<IActionResult> Post(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        return await Run(
            async () =>
            {
                await _repository.PostAsync(
                    id,
                    UserId);

                return NoContent();
            },
            "Post Payment Voucher");
    }

    [HttpPut("{publicId:guid}/cancel")]

    public async Task<IActionResult> Cancel(
        Guid publicId,
        CancelPaymentVoucherDto dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        return await Run(
            async () =>
            {
                await _repository.CancelAsync(
                    id,
                    dto,
                    UserId);

                return NoContent();
            },
            "Cancel Payment Voucher");
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
                "PaymentVoucher"));
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Until login identity is wired into the API
    private long UserId => this.CurrentUserId();

    // Today in Bangladesh time (preview default date), whatever
    // the server clock
    private static DateOnly BusinessToday()
    {
        foreach (string id in new[] { "Asia/Dhaka", "Bangladesh Standard Time" })
        {
            try
            {
                return DateOnly.FromDateTime(
                    TimeZoneInfo.ConvertTimeFromUtc(
                        DateTime.UtcNow,
                        TimeZoneInfo.FindSystemTimeZoneById(id)));
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return DateOnly.FromDateTime(DateTime.Now);
    }

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