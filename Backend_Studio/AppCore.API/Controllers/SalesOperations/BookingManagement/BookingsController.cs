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
// Bookings Controller (motor bikes; hand-written page, NO Code
// Sync). Tabs : Bookings / Collections / Cancellations & Refunds.
//
//   GET    ''                          page data (bookings,
//                                      collections, switches,
//                                      models)
//   GET    open?customerId=            open bookings of a customer
//                                      (Sales Invoice - MB)
//   GET    history/{bookingId}         one booking's history
//   POST   ''                          new booking + first
//                                      collection (Receipt Voucher)
//   PUT    {publicId}                  details of an open booking
//   POST   {publicId}/collect          more advance
//   PUT    {publicId}/cancel           cancel ("Cancel Booking")
//===============================================================

[ApiController]
[Route("api/sales-operations/booking-management/bookings")]
public class BookingsController
    : ControllerBase
{
    private const string PageRoute =
        "/sales-operations/%/bookings";

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


    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });


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
            // Usually the tables are missing : run
            // BookingsMB_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }


    [HttpGet]
    public Task<IActionResult> GetPage()
    {
        long branchId = BranchId;

        long userId = UserId;

        return Run(
            async () =>
            {
                BookingsPageDto page = await _repository.GetPageAsync(branchId);

                page.CanCancel = await _effectiveAccess.HasActivityAsync(userId, PageRoute, ActivityCancel);

                return Ok(page);
            },
            "The bookings could not be loaded.");
    }


    [HttpGet("open")]
    public Task<IActionResult> GetOpen([FromQuery] long customerId)
    {
        return Run(
            async () => Ok(await _repository.GetOpenForCustomerAsync(customerId)),
            "The open bookings could not be loaded.");
    }


    [HttpGet("history/{bookingId:long}")]
    public Task<IActionResult> GetHistory(long bookingId)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Sales Operations", "Booking", bookingId)),
            "The booking history could not be loaded.");
    }


    [HttpPost]
    public Task<IActionResult> Create([FromBody] CreateBookingDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Run(
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateBookingDto(), branchId, userId)),
            "The booking could not be saved.");
    }


    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] UpdateBookingDto? dto)
    {
        long userId = UserId;

        return Run(
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new UpdateBookingDto(), userId);

                return NoContent();
            },
            "The booking could not be updated.");
    }


    [HttpPost("{publicId:guid}/collect")]
    public Task<IActionResult> Collect(Guid publicId, [FromBody] CollectBookingDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Run(
            async () => Ok(await _repository.CollectAsync(publicId, dto ?? new CollectBookingDto(), branchId, userId)),
            "The advance could not be collected.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid publicId, [FromBody] CancelBookingDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        if (!await _effectiveAccess.HasActivityAsync(userId, PageRoute, ActivityCancel))
        {
            return Fail(StatusCodes.Status403Forbidden, "You do not have the \"Cancel Booking\" permission on Bookings.");
        }

        return await Run(
            async () => Ok(await _repository.CancelAsync(publicId, dto ?? new CancelBookingDto(), branchId, userId)),
            "The booking could not be cancelled.");
    }
}
