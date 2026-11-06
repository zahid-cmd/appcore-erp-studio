//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.EnquiryManagement.FollowUpsAppointments;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Test Rides Controller (Follow-ups & Appointments ›
// Test Rides page : list + form)
//
//   GET    paged?page=&pageSize=&search=&sort=&dir=&period=
//               &status=&branchId=     one list page + counts
//   GET    defaults?date=&branchId=    slots, waiting enquiries,
//                                      sales executives (the form)
//   GET    {publicId}                  one test ride
//   POST   ''                          (Add : book) → PublicId
//   PUT    {publicId}                  (Update : move / status / bike /
//                                      executive / note)
//   DELETE {publicId}                  (Delete; 409 while live)
//   PUT    restore                     latest deleted (Restore)
//   GET    history                     the page's history
//   GET    {id}/history                one test ride's history
//
// The day board keeps its own calls on the Sales Enquiries
// controller (test-rides/day, book, reschedule, status).
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for the Test
// Rides submenu.
//===============================================================

[ApiController]
[Route("api/enquiry-management/follow-ups-appointments/test-rides")]
public class TestRidesController
    : ControllerBase
{
    private const string PageRoute =
        "/enquiry-management/follow-ups-appointments/test-rides";

    private const string PageName =
        "Test Rides";

    private readonly ITestRidesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<TestRidesController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public TestRidesController(
        ITestRidesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<TestRidesController> logger)
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
                $"You do not have the \"{activity}\" permission on {PageName}.");
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
            // Usually a missing column : run
            // EnquiryFollowUps_PublicId.sql
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


    // The test ride behind a link (404 when missing / deleted)
    private async Task<long> RequireIdAsync
    (
        Guid publicId
    )
    {
        return await _repository.GetIdByPublicIdAsync(publicId)
            ?? throw new KeyNotFoundException("Test ride not found. It may have been deleted.");
    }



    //===========================================================
    // Read
    //===========================================================

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] TestRidesPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request)),
            "Test rides could not be loaded.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] DateOnly? date,
        [FromQuery] long branchId)
    {
        DateOnly day = date ?? DateOnly.FromDateTime(DateTime.Now);

        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(day, branchId)),
            "The test ride slots could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Enquiry Management", "SalesTestRides")),
            "Test ride history could not be loaded.");
    }


    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> GetById(
        Guid publicId)
    {
        return Run(
            async () =>
            {
                long id =
                    await RequireIdAsync(publicId);

                SalesTestRideDto? row =
                    await _repository.GetByIdAsync(id);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "Test ride not found.")
                    : Ok(row);
            },
            "The test ride could not be loaded.");
    }


    [HttpGet("{id:long}/history")]
    public Task<IActionResult> GetEntityHistory(
        long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Enquiry Management", "SalesTestRides", id)),
            "The test ride history could not be loaded.");
    }



    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateTestRidesDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateTestRidesDto(), userId)),
            "The test ride could not be booked.");
    }


    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(
        Guid publicId,
        [FromBody] UpdateTestRidesDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                long id =
                    await RequireIdAsync(publicId);

                await _repository.UpdateAsync(id, dto ?? new UpdateTestRidesDto(), userId);

                return NoContent();
            },
            "The test ride could not be updated.");
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
                long id =
                    await RequireIdAsync(publicId);

                await _repository.DeleteAsync(id, userId);

                return NoContent();
            },
            "The test ride could not be deleted.",
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
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted test rides to restore.");
            },
            "The test ride could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
