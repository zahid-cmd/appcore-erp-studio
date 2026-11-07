//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries Controller
//
//   GET    ''                         live enquiries (list)
//   GET    print                      the same, for the print report (Print)
//   GET    defaults?enquiryDate=      next number + every dropdown
//   GET    enquirer?mobile=&excludeId= known enquirer, matching
//                                     customer, earlier enquiries
//   GET    paged?page=&pageSize=&search=&sort=&dir=&tab=&...
//                                     one list page + counts
//   GET    {publicId}                 (uuid : links, address bar)
//   GET    by-id/{id}                 (internal id : boards)
//   POST   ''                         (Add)
//   PUT    ''                         (Update)
//   DELETE {publicId}                 (Delete; 409 when matured)
//   PUT    restore                    latest deleted (Restore)
//   GET    history
//   GET    {id}/history
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//===============================================================

[ApiController]
[Route("api/enquiry-management/enquiry-profiles/sales-enquiries")]
public class SalesEnquiriesController
    : ControllerBase
{
    private const string PageRoute =
        "/enquiry-management/%/sales-enquiries";


    private readonly ISalesEnquiriesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<SalesEnquiriesController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public SalesEnquiriesController(
        ISalesEnquiriesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesEnquiriesController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }



    //===========================================================
    // Answers : { message }
    //===========================================================

    private ObjectResult Fail
    (
        int statusCode,
        string message
    )
    {
        return StatusCode(
            statusCode,
            new { message });
    }


    private async Task<IActionResult?> DenyAsync
    (
        string activity
    )
    {
        bool allowed =
            await _effectiveAccess.HasActivityAsync(
                UserId,
                PageRoute,
                activity);

        return allowed
            ? null
            : Fail(
                StatusCodes.Status403Forbidden,
                $"You do not have the \"{activity}\" permission on Sales Enquiries.");
    }


    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> action,
        string failure,
        int ruleStatus = StatusCodes.Status400BadRequest
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
            return Fail(ruleStatus, ex.Message);
        }
        catch (Exception ex)
        {
            // Usually a missing table / column : run
            // SalesEnquiries_Tables.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(
                StatusCodes.Status500InternalServerError,
                $"{failure} {ex.GetBaseException().Message}");
        }
    }


    private async Task<IActionResult> Guarded
    (
        string activity,
        Func<Task<IActionResult>> action,
        string failure,
        int ruleStatus = StatusCodes.Status400BadRequest
    )
    {
        IActionResult? denied =
            await DenyAsync(activity);

        return denied ?? await Run(action, failure, ruleStatus);
    }



    //===========================================================
    // Read
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync()),
            "Sales enquiries could not be loaded.");
    }


    // The list's print report (Print permission)
    [HttpGet("print")]
    public Task<IActionResult> GetForPrint()
    {
        return Guarded(
            "Print",
            async () => Ok(await _repository.GetAllAsync()),
            "Sales enquiries could not be loaded for printing.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] DateOnly? enquiryDate)
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(enquiryDate)),
            "Sales enquiry defaults could not be loaded.");
    }


    [HttpGet("enquirer")]
    public Task<IActionResult> LookupEnquirer(
        [FromQuery] string? mobile,
        [FromQuery] long excludeId)
    {
        return Run(
            async () => Ok(await _repository.LookupEnquirerAsync(mobile ?? string.Empty, excludeId)),
            "The enquirer could not be looked up.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Enquiry Management", "SalesEnquiries")),
            "Sales enquiry history could not be loaded.");
    }


    // One list page (server paging) with the tab / chip counts
    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] SalesEnquiryPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request)),
            "Sales enquiries could not be loaded.");
    }


    // By the public id (links and the address bar)
    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> GetById(
        Guid publicId)
    {
        return Run(
            async () =>
            {
                long? foundId =
                    await _repository.GetIdByPublicIdAsync(publicId);

                if (foundId == null)
                {
                    return Fail(StatusCodes.Status404NotFound, "Sales enquiry not found.");
                }

                long id = foundId.Value;

                SalesEnquiriesDto? row =
                    await _repository.GetByIdAsync(id);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Sales enquiry not found.")
                    : Ok(row);
            },
            "The sales enquiry could not be loaded.");
    }


    // By the internal id (the boards open an enquiry by its id)
    [HttpGet("by-id/{id:long}")]
    public Task<IActionResult> GetByInternalId(
        long id)
    {
        return Run(
            async () =>
            {
                SalesEnquiriesDto? row =
                    await _repository.GetByIdAsync(id);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Sales enquiry not found.")
                    : Ok(row);
            },
            "The sales enquiry could not be loaded.");
    }


    [HttpGet("{publicId:guid}/history")]
    public async Task<IActionResult> GetEntityHistory(
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
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Enquiry Management", "SalesEnquiries", id)),
            "Sales enquiry history could not be loaded.");
    }



    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateSalesEnquiriesDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateSalesEnquiriesDto(), userId)),
            "The sales enquiry could not be saved.");
    }


    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        [FromBody] UpdateSalesEnquiriesDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        dto ??= new UpdateSalesEnquiriesDto();

        dto.SalesEnquiryId =
            id;

        long userId = UserId;

        return await Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(dto ?? new UpdateSalesEnquiriesDto(), userId);

                return NoContent();
            },
            "The sales enquiry could not be updated.");
    }


    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(
        Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            "Delete",
            async () =>
            {
                long? foundId =
                    await _repository.GetIdByPublicIdAsync(publicId);

                if (foundId == null)
                {
                    return Fail(StatusCodes.Status404NotFound, "Sales enquiry not found.");
                }

                long id = foundId.Value;

                await _repository.DeleteAsync(id, userId);

                return NoContent();
            },
            "The sales enquiry could not be deleted.",
            StatusCodes.Status409Conflict);
    }


    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
            {
                bool restored =
                    await _repository.RestoreAsync(userId);

                return restored
                    ? (IActionResult)NoContent()
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted sales enquiries to restore.");
            },
            "The sales enquiry could not be restored.",
            StatusCodes.Status409Conflict);
    }



    //===========================================================
    // Follow-ups : calls / visits logged on an enquiry
    //   GET  {id}/follow-ups       the enquiry's calls
    //   GET  follow-ups/recent     calls from N days ago (dashboard)
    //   POST follow-ups            log a call (Update permission)
    //===========================================================

    [HttpGet("{id:long}/follow-ups")]
    public Task<IActionResult> GetFollowUps(
        long id)
    {
        return Run(
            async () => Ok(await _repository.GetFollowUpsAsync(id)),
            "The follow-ups could not be loaded. Run SalesFollowUps_Tables.sql.");
    }


    [HttpGet("follow-ups/recent")]
    public Task<IActionResult> GetRecentFollowUps(
        [FromQuery] int days = 0)
    {
        int back = Math.Clamp(days, 0, 90);

        return Run(
            async () => Ok(await _repository.GetRecentFollowUpsAsync(DateOnly.FromDateTime(DateTime.Now).AddDays(-back))),
            "The follow-ups could not be loaded. Run SalesFollowUps_Tables.sql.");
    }


    [HttpPost("follow-ups")]
    public Task<IActionResult> LogFollowUp(
        [FromBody] LogSalesFollowUpDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () => Ok(await _repository.LogFollowUpAsync(dto ?? new LogSalesFollowUpDto(), userId)),
            "The follow-up could not be saved.");
    }



    //===========================================================
    // Test Rides (Update permission to book or change)
    //   GET  test-rides/day?date=&branchId=&weekFrom=  the day
    //                                           board (+ 7-day counts)
    //   GET  test-rides/active?branchId=       live of every date +
    //                                           requests (asked date,
    //                                           not booked yet)
    //   GET  test-rides/count?date=&branchId=  live + ridden
    //   GET  {id}/test-rides                    the enquiry's
    //   GET  test-rides/{id}/history
    //   POST test-rides                         book
    //   PUT  test-rides/reschedule              move (date / slot)
    //   PUT  test-rides/status                  Confirmed / Ridden /
    //                                           NoShow / Cancelled
    //===========================================================

    [HttpGet("test-rides/day")]
    public Task<IActionResult> GetTestRideDay(
        [FromQuery] DateOnly? date,
        [FromQuery] long branchId,
        [FromQuery] DateOnly? weekFrom)
    {
        DateOnly day = date ?? DateOnly.FromDateTime(DateTime.Now);

        return Run(
            async () => Ok(await _repository.GetTestRideDayAsync(day, branchId, weekFrom)),
            "The test rides could not be loaded. Run SalesTestRides_Tables.sql.");
    }


    [HttpGet("test-rides/active")]
    public Task<IActionResult> GetActiveTestRides(
        [FromQuery] long branchId)
    {
        return Run(
            async () => Ok(await _repository.GetActiveTestRidesAsync(branchId)),
            "The test rides could not be loaded. Run SalesTestRides_Tables.sql.");
    }


    [HttpGet("test-rides/count")]
    public Task<IActionResult> CountTestRides(
        [FromQuery] DateOnly? date,
        [FromQuery] long branchId)
    {
        DateOnly day = date ?? DateOnly.FromDateTime(DateTime.Now);

        return Run(
            async () => Ok(await _repository.CountTestRidesAsync(day, branchId)),
            "The test rides could not be counted. Run SalesTestRides_Tables.sql.");
    }


    [HttpGet("{id:long}/test-rides")]
    public Task<IActionResult> GetEnquiryTestRides(
        long id)
    {
        return Run(
            async () => Ok(await _repository.GetEnquiryTestRidesAsync(id)),
            "The test rides could not be loaded. Run SalesTestRides_Tables.sql.");
    }


    [HttpGet("test-rides/{id:long}/history")]
    public Task<IActionResult> GetTestRideHistory(
        long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Enquiry Management", "SalesTestRides", id)),
            "The test ride history could not be loaded.");
    }


    [HttpPost("test-rides")]
    public Task<IActionResult> BookTestRide(
        [FromBody] BookTestRideDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () => Ok(await _repository.BookTestRideAsync(dto ?? new BookTestRideDto(), userId)),
            "The test ride could not be booked.");
    }


    [HttpPut("test-rides/reschedule")]
    public Task<IActionResult> RescheduleTestRide(
        [FromBody] RescheduleTestRideDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.RescheduleTestRideAsync(dto ?? new RescheduleTestRideDto(), userId);

                return NoContent();
            },
            "The test ride could not be moved.");
    }


    [HttpPut("test-rides/status")]
    public Task<IActionResult> SetTestRideStatus(
        [FromBody] TestRideStatusDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.SetTestRideStatusAsync(dto ?? new TestRideStatusDto(), userId);

                return NoContent();
            },
            "The test ride could not be updated.");
    }
}
