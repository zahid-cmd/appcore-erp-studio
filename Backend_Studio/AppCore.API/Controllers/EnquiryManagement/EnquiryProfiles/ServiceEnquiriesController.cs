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
// Service Enquiries Controller
//
//   GET    ''                         live enquiries (list)
//   GET    defaults?enquiryDate=      next number + every dropdown
//   GET    enquirer?mobile=&excludeId= known enquirer, matching
//                                     customer, earlier enquiries
//   GET    paged?page=&pageSize=&search=&sort=&dir=&tab=&...
//                                     one list page + counts
//   GET    {publicId}                 (uuid : links, address bar)
//   GET    by-id/{id}                 (internal id : boards)
//   POST   ''                         (Add)
//   PUT    ''                         (Update)
//   GET    parts                      spare parts + accessories
//                                     (MRP, stock on hand)
//   DELETE {publicId}                 (Delete; 409 when closed)
//   PUT    restore                    latest deleted (Restore)
//   GET    history
//   GET    {id}/history
//
// Sold bikes (our outlet) and their service schedules :
//   GET    vehicles                   every sold bike + schedule
//   GET    vehicles/{id}
//   GET    vehicles/preview?modelId=&saleDate=
//   POST   vehicles                   (Add : sold before the ERP)
//   PUT    vehicles                   (Update)
//   DELETE vehicles/{id}              (Delete; bikes added by hand)
//   PUT    vehicles/restore           (Restore)
//   GET    vehicles/history · vehicles/{id}/history
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//===============================================================

[ApiController]
[Route("api/enquiry-management/enquiry-profiles/service-enquiries")]
public class ServiceEnquiriesController
    : ControllerBase
{
    private const string PageRoute =
        "/enquiry-management/%/service-enquiries";


    private readonly IServiceEnquiriesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<ServiceEnquiriesController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public ServiceEnquiriesController(
        IServiceEnquiriesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<ServiceEnquiriesController> logger)
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
                $"You do not have the \"{activity}\" permission on Service Enquiries.");
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
            // ServiceEnquiries_Tables.sql
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
            "Service enquiries could not be loaded.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] DateOnly? enquiryDate)
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(enquiryDate)),
            "Service enquiry defaults could not be loaded.");
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


    [HttpGet("parts")]
    public Task<IActionResult> GetParts()
    {
        return Run(
            async () => Ok(await _repository.GetPartsAsync()),
            "The parts catalogue could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Enquiry Management", "ServiceEnquiries")),
            "Service enquiry history could not be loaded.");
    }


    // One list page (server paging) with the tab / chip counts
    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] ServiceEnquiryPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request)),
            "Service enquiries could not be loaded.");
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
                    return Fail(StatusCodes.Status404NotFound, "Service enquiry not found.");
                }

                long id = foundId.Value;

                ServiceEnquiriesDto? row =
                    await _repository.GetByIdAsync(id);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Service enquiry not found.")
                    : Ok(row);
            },
            "The service enquiry could not be loaded.");
    }


    // By the internal id (the boards open an enquiry by its id)
    [HttpGet("by-id/{id:long}")]
    public Task<IActionResult> GetByInternalId(
        long id)
    {
        return Run(
            async () =>
            {
                ServiceEnquiriesDto? row =
                    await _repository.GetByIdAsync(id);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Service enquiry not found.")
                    : Ok(row);
            },
            "The service enquiry could not be loaded.");
    }


    [HttpGet("{id:long}/history")]
    public Task<IActionResult> GetEntityHistory(
        long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Enquiry Management", "ServiceEnquiries", id)),
            "Service enquiry history could not be loaded.");
    }



    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateServiceEnquiriesDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateServiceEnquiriesDto(), userId)),
            "The service enquiry could not be saved.");
    }


    [HttpPut]
    public Task<IActionResult> Update(
        [FromBody] UpdateServiceEnquiriesDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(dto ?? new UpdateServiceEnquiriesDto(), userId);

                return NoContent();
            },
            "The service enquiry could not be updated.");
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
                    return Fail(StatusCodes.Status404NotFound, "Service enquiry not found.");
                }

                long id = foundId.Value;

                await _repository.DeleteAsync(id, userId);

                return NoContent();
            },
            "The service enquiry could not be deleted.",
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
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted service enquiries to restore.");
            },
            "The service enquiry could not be restored.",
            StatusCodes.Status409Conflict);
    }



    //===========================================================
    // Sold bikes (our outlet) : service schedules
    //===========================================================

    [HttpGet("vehicles")]
    public Task<IActionResult> GetVehicles()
    {
        return Run(
            async () => Ok(await _repository.GetVehiclesAsync()),
            "Sold bikes could not be loaded. Run ServiceVehicles_Tables.sql.");
    }


    [HttpGet("vehicles/preview")]
    public Task<IActionResult> PreviewSchedule(
        [FromQuery] long modelId,
        [FromQuery] DateOnly? saleDate)
    {
        return Run(
            async () => Ok(await _repository.PreviewScheduleAsync(modelId, saleDate ?? DateOnly.FromDateTime(DateTime.Now))),
            "The service schedule could not be worked out.");
    }


    [HttpGet("vehicles/history")]
    public Task<IActionResult> GetVehicleHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Enquiry Management", "ServiceVehicles")),
            "Sold bike history could not be loaded.");
    }


    [HttpGet("vehicles/{id:long}")]
    public Task<IActionResult> GetVehicleById(
        long id)
    {
        return Run(
            async () =>
            {
                ServiceVehicleDto? row =
                    await _repository.GetVehicleByIdAsync(id);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Sold bike not found.")
                    : Ok(row);
            },
            "The sold bike could not be loaded.");
    }


    [HttpGet("vehicles/{id:long}/history")]
    public Task<IActionResult> GetVehicleEntityHistory(
        long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Enquiry Management", "ServiceVehicles", id)),
            "Sold bike history could not be loaded.");
    }


    [HttpPost("vehicles")]
    public Task<IActionResult> CreateVehicle(
        [FromBody] SaveServiceVehicleDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateVehicleAsync(dto ?? new SaveServiceVehicleDto(), userId)),
            "The sold bike could not be saved.");
    }


    [HttpPut("vehicles")]
    public Task<IActionResult> UpdateVehicle(
        [FromBody] SaveServiceVehicleDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateVehicleAsync(dto ?? new SaveServiceVehicleDto(), userId);

                return NoContent();
            },
            "The sold bike could not be updated.");
    }


    [HttpDelete("vehicles/{id:long}")]
    public Task<IActionResult> DeleteVehicle(
        long id)
    {
        long userId = UserId;

        return Guarded(
            "Delete",
            async () =>
            {
                await _repository.DeleteVehicleAsync(id, userId);

                return NoContent();
            },
            "The sold bike could not be deleted.",
            StatusCodes.Status409Conflict);
    }


    [HttpPut("vehicles/restore")]
    public Task<IActionResult> RestoreVehicle()
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
            {
                bool restored =
                    await _repository.RestoreVehicleAsync(userId);

                return restored
                    ? (IActionResult)NoContent()
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted sold bikes to restore.");
            },
            "The sold bike could not be restored.",
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
            "The follow-ups could not be loaded. Run ServiceFollowUps_Tables.sql.");
    }


    [HttpGet("follow-ups/recent")]
    public Task<IActionResult> GetRecentFollowUps(
        [FromQuery] int days = 0)
    {
        int back = Math.Clamp(days, 0, 90);

        return Run(
            async () => Ok(await _repository.GetRecentFollowUpsAsync(DateOnly.FromDateTime(DateTime.Now).AddDays(-back))),
            "The follow-ups could not be loaded. Run ServiceFollowUps_Tables.sql.");
    }


    [HttpPost("follow-ups")]
    public Task<IActionResult> LogFollowUp(
        [FromBody] LogServiceFollowUpDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () => Ok(await _repository.LogFollowUpAsync(dto ?? new LogServiceFollowUpDto(), userId)),
            "The follow-up could not be saved.");
    }



    //===========================================================
    // Appointments (Service enquiries; Update permission to book
    // or change)
    //   GET  appointments/day?date=&branchId=&weekFrom=  the day
    //                                           board (+ 7-day counts)
    //   GET  appointments/active?branchId=     live of every date +
    //                                           requests (asked date,
    //                                           not booked yet)
    //   GET  appointments/count?date=&branchId= live + arrived
    //   GET  {id}/appointments                  the enquiry's
    //   GET  appointments/{id}/history
    //   POST appointments                       book
    //   PUT  appointments/reschedule            move (date / slot)
    //   PUT  appointments/status                Confirmed / Arrived /
    //                                           NoShow / Cancelled
    //===========================================================

    [HttpGet("appointments/day")]
    public Task<IActionResult> GetAppointmentDay(
        [FromQuery] DateOnly? date,
        [FromQuery] long branchId,
        [FromQuery] DateOnly? weekFrom)
    {
        DateOnly day = date ?? DateOnly.FromDateTime(DateTime.Now);

        return Run(
            async () => Ok(await _repository.GetAppointmentDayAsync(day, branchId, weekFrom)),
            "The appointments could not be loaded. Run ServiceAppointments_Tables.sql.");
    }


    [HttpGet("appointments/active")]
    public Task<IActionResult> GetActiveAppointments(
        [FromQuery] long branchId)
    {
        return Run(
            async () => Ok(await _repository.GetActiveAppointmentsAsync(branchId)),
            "The appointments could not be loaded. Run ServiceAppointments_Tables.sql.");
    }


    [HttpGet("appointments/count")]
    public Task<IActionResult> CountAppointments(
        [FromQuery] DateOnly? date,
        [FromQuery] long branchId)
    {
        DateOnly day = date ?? DateOnly.FromDateTime(DateTime.Now);

        return Run(
            async () => Ok(await _repository.CountAppointmentsAsync(day, branchId)),
            "The appointments could not be counted. Run ServiceAppointments_Tables.sql.");
    }


    [HttpGet("{id:long}/appointments")]
    public Task<IActionResult> GetEnquiryAppointments(
        long id)
    {
        return Run(
            async () => Ok(await _repository.GetEnquiryAppointmentsAsync(id)),
            "The appointments could not be loaded. Run ServiceAppointments_Tables.sql.");
    }


    [HttpGet("appointments/{id:long}/history")]
    public Task<IActionResult> GetAppointmentHistory(
        long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Enquiry Management", "ServiceAppointments", id)),
            "The appointment history could not be loaded.");
    }


    [HttpPost("appointments")]
    public Task<IActionResult> BookAppointment(
        [FromBody] BookServiceAppointmentDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () => Ok(await _repository.BookAppointmentAsync(dto ?? new BookServiceAppointmentDto(), userId)),
            "The appointment could not be booked.");
    }


    [HttpPut("appointments/reschedule")]
    public Task<IActionResult> RescheduleAppointment(
        [FromBody] RescheduleServiceAppointmentDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.RescheduleAppointmentAsync(dto ?? new RescheduleServiceAppointmentDto(), userId);

                return NoContent();
            },
            "The appointment could not be moved.");
    }


    [HttpPut("appointments/status")]
    public Task<IActionResult> SetAppointmentStatus(
        [FromBody] ServiceAppointmentStatusDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.SetAppointmentStatusAsync(dto ?? new ServiceAppointmentStatusDto(), userId);

                return NoContent();
            },
            "The appointment could not be updated.");
    }
}
