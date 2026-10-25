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
// Fund Transfer Controller
//
//   GET    /                    list
//   GET    /defaults            next voucher number (preview)
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

[Route("api/accounts-finance/voucher-management/fund-transfer")]

public class FundTransferController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IFundTransferRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<FundTransferController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public FundTransferController(
        IFundTransferRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<FundTransferController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Read
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<FundTransferDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }

    //===========================================================
    // Defaults (Add form) : next voucher number for branch + date
    //   GET defaults?branchId=1&date=2026-10-22
    // Always 200; Message tells why there is no number.
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<FundTransferDefaultsDto>> GetDefaults(
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


    [HttpGet("{id:long}")]

    public async Task<ActionResult<FundTransferDto>> GetById(
        long id)
    {
        FundTransferDto? item =
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
        CreateFundTransferDto dto)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.CreateAsync(
                        dto,
                        UserId)),
            "Create Fund Transfer",
            badRequestOnInvalid: true);
    }

    [HttpPut]

    public Task<IActionResult> Update(
        UpdateFundTransferDto dto)
    {
        return Run(
            async () =>
            {
                await _repository.UpdateAsync(
                    dto,
                    UserId);

                return NoContent();
            },
            "Update Fund Transfer",
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
            "Delete Fund Transfer");
    }

    [HttpPut("restore")]

    public Task<IActionResult> Restore()
    {
        return Run(
            async () =>
                await _repository.RestoreAsync(UserId)
                    ? NoContent()
                    : NotFound("There are no deleted fund transfers available to restore."),
            "Restore Fund Transfer");
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
            "Approve Fund Transfer");
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
            "Return Fund Transfer To Draft");
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
            "Post Fund Transfer");
    }

    [HttpPut("{id:long}/cancel")]

    public Task<IActionResult> Cancel(
        long id,
        CancelFundTransferDto dto)
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
            "Cancel Fund Transfer");
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
                "FundTransfer"));
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Until login identity is wired into the API
    private static long UserId => 1;

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