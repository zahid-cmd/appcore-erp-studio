//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.BookingManagement;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.BookingManagement;


//===============================================================
// Bookings Controller (MB / SP / AC; hand-written pages, NO Code
// Sync). One page per type : Bookings - MB / SP / AC. Tabs :
// Bookings / Collections / Cancellations & Refunds.
//
//   {type} = mb / sp / ac
//   GET    {type}                      page data (bookings,
//                                      collections, switches,
//                                      models (MB))
//   GET    {type}/products?term=&categoryId=&subCategoryId=
//                                      SP / AC : item search
//   GET    {type}/open?customerId=     open bookings of a customer
//                                      (Sales Invoice of the type)
//   GET    {type}/history/{bookingId}  one booking's history
//   GET    {type}/history                the page's history (all
//                                      bookings of the type)
//   DELETE {type}/{publicId}           soft delete (open booking;
//                                      receipts cancelled)
//   PUT    {type}/restore              restore the latest deleted
//                                      (branch; receipts again)
//   POST   {type}                      new booking + first
//                                      collection (Receipt Voucher)
//   PUT    {type}/{publicId}           details of an open booking
//   POST   {type}/{publicId}/collect   more advance
//   PUT    {type}/{publicId}/cancel    cancel ("Cancel Booking")
//===============================================================

[ApiController]
[Route("api/sales-operations/booking-management/bookings/{type}")]
public class BookingsController
    : ControllerBase
{
    private const string ActivityCancel =
        "Cancel Booking";

    private readonly IBookingsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<BookingsController> _logger;


    private long UserId => this.CurrentUserId();

    private long BranchId => this.CurrentBranchId() ?? 0;


    public BookingsController(
        IBookingsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<BookingsController> logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }


    // mb -> MB ('' when not MB / SP / AC)
    private static string TypeCode(string? type)
    {
        string code = (type ?? string.Empty).Trim().ToUpperInvariant();

        return code is "MB" or "SP" or "AC" ? code : string.Empty;
    }

    // The page of the type (permissions)
    private static string PageRoute(string code) =>
        $"/sales-operations/%/bookings-{code.ToLowerInvariant()}";


    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });


    private async Task<IActionResult> Run
    (
        string? type,
        Func<string, Task<IActionResult>> action,
        string failure
    )
    {
        string code = TypeCode(type);

        if (code.Length == 0)
        {
            return Fail(StatusCodes.Status404NotFound, "Booking type must be mb, sp or ac.");
        }

        try
        {
            return await action(code);
        }
        catch (KeyNotFoundException ex)
        {
            return Fail(StatusCodes.Status404NotFound, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Fail(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Fail(StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            // Usually the tables are missing : run Bookings_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }


    [HttpGet]
    public Task<IActionResult> GetPage(string type)
    {
        long branchId = BranchId;

        long userId = UserId;

        return Run(
            type,
            async code =>
            {
                BookingsPageDto page = await _repository.GetPageAsync(code, branchId);

                page.CanCancel = await _effectiveAccess.HasActivityAsync(userId, PageRoute(code), ActivityCancel);

                return Ok(page);
            },
            "The bookings could not be loaded.");
    }


    [HttpGet("products")]
    public Task<IActionResult> SearchProducts(string type, [FromQuery] string? term, [FromQuery] long categoryId = 0, [FromQuery] long subCategoryId = 0)
    {
        return Run(
            type,
            async code => Ok(await _repository.SearchProductsAsync(code, term ?? string.Empty, categoryId, subCategoryId)),
            "The items could not be searched.");
    }


    [HttpGet("open")]
    public Task<IActionResult> GetOpen(string type, [FromQuery] long customerId)
    {
        return Run(
            type,
            async code => Ok(await _repository.GetOpenForCustomerAsync(code, customerId)),
            "The open bookings could not be loaded.");
    }


    [HttpGet("history/{bookingId:long}")]
    public Task<IActionResult> GetHistory(string type, long bookingId)
    {
        return Run(
            type,
            async _ => Ok(await _activityHistoryRepository.GetHistoryAsync("Sales Operations", "Booking", bookingId)),
            "The booking history could not be loaded.");
    }


    // The page's history : every booking of the type, newest first
    [HttpGet("history")]
    public Task<IActionResult> GetPageHistory(string type)
    {
        return Run(
            type,
            async code =>
            {
                HashSet<long> ids = (await _repository.BookingIdsAsync(code)).ToHashSet();

                return Ok(
                    (await _activityHistoryRepository.GetListHistoryAsync("Sales Operations", "Booking"))
                        .Where(x => ids.Contains(x.EntityId))
                        .OrderByDescending(x => x.PerformedDate)
                        .ToList());
            },
            "The booking history could not be loaded.");
    }


    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(string type, Guid publicId)
    {
        long userId = UserId;

        return Run(
            type,
            async code =>
            {
                await _repository.DeleteAsync(code, publicId, userId);

                return Ok(new { message = "Booking deleted." });
            },
            "The booking could not be deleted.");
    }


    [HttpPut("restore")]
    public Task<IActionResult> Restore(string type)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Run(
            type,
            async code =>
            {
                string bookingNo = await _repository.RestoreAsync(code, branchId, userId);

                return Ok(new { BookingNo = bookingNo, message = $"{bookingNo} restored." });
            },
            "The booking could not be restored.");
    }


    [HttpPost]
    public Task<IActionResult> Create(string type, [FromBody] CreateBookingDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Run(
            type,
            async code => Ok(await _repository.CreateAsync(code, dto ?? new CreateBookingDto(), branchId, userId)),
            "The booking could not be saved.");
    }


    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(string type, Guid publicId, [FromBody] UpdateBookingDto? dto)
    {
        long userId = UserId;

        return Run(
            type,
            async code =>
            {
                await _repository.UpdateAsync(code, publicId, dto ?? new UpdateBookingDto(), userId);

                return NoContent();
            },
            "The booking could not be updated.");
    }


    [HttpPost("{publicId:guid}/collect")]
    public Task<IActionResult> Collect(string type, Guid publicId, [FromBody] CollectBookingDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Run(
            type,
            async code => Ok(await _repository.CollectAsync(code, publicId, dto ?? new CollectBookingDto(), branchId, userId)),
            "The advance could not be collected.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public Task<IActionResult> Cancel(string type, Guid publicId, [FromBody] CancelBookingDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Run(
            type,
            async code =>
            {
                if (!await _effectiveAccess.HasActivityAsync(userId, PageRoute(code), ActivityCancel))
                {
                    return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"Cancel Booking\" permission on Bookings - {code}.");
                }

                return Ok(await _repository.CancelAsync(code, publicId, dto ?? new CancelBookingDto(), branchId, userId));
            },
            "The booking could not be cancelled.");
    }
}