//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.HumanResourceManangement.AttendanceManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Attendance Management controllers (hand-written pages : NEVER
// run Code Sync for them)
//
//   api/human-resource-manangement/attendance-management/
//     daily-attendance
//       GET  ''?date=&branchId=    the day of a branch
//       PUT  ''                    save the sheet (Add or Update)
//       GET  history
//     monthly-attendance
//       GET  ''?year=&month=&branchId=
//     leave-applications
//       GET  ''                    list
//       GET  defaults              next code, employees, leave types
//       GET  balance?employeeId=&date=
//       GET  days?employeeId=&from=&to=   working days of a range
//       GET  history
//       GET  {publicId}
//       POST ''                    PUT {publicId}
//       PUT  {publicId}/approve    {publicId}/reject   (Approve)
//       PUT  {publicId}/cancel     (Approve)
//       DELETE {publicId}          PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

public abstract class HrAttendanceControllerBase
    : ControllerBase
{
    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;

    protected abstract string PageRoute { get; }

    protected abstract string PageName { get; }

    protected long UserId => this.CurrentUserId();

    protected HrAttendanceControllerBase(
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
    {
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }

    protected ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });

    protected async Task<IActionResult> Run(Func<Task<IActionResult>> action, string failure, int ruleStatus = StatusCodes.Status400BadRequest)
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
            // Usually the tables are missing : run
            // HumanResource_Phase2_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);
            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }

    // Any one of the activities is enough
    protected async Task<IActionResult> Guarded(string[] activities, Func<Task<IActionResult>> action, string failure, int ruleStatus = StatusCodes.Status400BadRequest)
    {
        long userId = UserId;

        bool allowed = false;

        foreach (string activity in activities)
        {
            if (await _effectiveAccess.HasActivityAsync(userId, PageRoute, activity))
            {
                allowed = true;
                break;
            }
        }

        if (!allowed)
        {
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{string.Join("\" or \"", activities)}\" permission on {PageName}.");
        }

        return await Run(action, failure, ruleStatus);
    }
}


[ApiController]
[Route("api/human-resource-manangement/attendance-management/daily-attendance")]
public class DailyAttendanceController
    : HrAttendanceControllerBase
{
    private readonly IAttendanceRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    public DailyAttendanceController(
        IAttendanceRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<DailyAttendanceController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/daily-attendance";

    protected override string PageName => "Daily Attendance";

    [HttpGet]
    public Task<IActionResult> Get([FromQuery] string? date, [FromQuery] long branchId = 0) =>
        Run(async () => Ok(await _repository.GetDailyAsync(date ?? string.Empty, branchId)), "The attendance of the day could not be loaded.");

    [HttpPut]
    public Task<IActionResult> Save([FromBody] SaveDailyAttendanceDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add", "Update" },
            async () => Ok(await _repository.SaveDailyAsync(dto ?? new SaveDailyAttendanceDto(), userId)),
            "The attendance could not be saved.");
    }

    // The list : every employee's month that has marks
    [HttpGet("months")]
    public Task<IActionResult> GetMonths() =>
        Run(async () => Ok(await _repository.GetEmployeeMonthsAsync()), "The attendance list could not be loaded.");

    // The marks of an employee's month go
    [HttpDelete("month")]
    public Task<IActionResult> DeleteMonth([FromQuery] long employeeId, [FromQuery] int year, [FromQuery] int month)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () => Ok(new { Deleted = await _repository.DeleteEmployeeMonthAsync(employeeId, year, month, userId) }),
            "The attendance could not be deleted.",
            StatusCodes.Status409Conflict);
    }

    // By month : one employee, a row for every day of the month
    [HttpGet("month")]
    public Task<IActionResult> GetMonth([FromQuery] int year, [FromQuery] int month, [FromQuery] long employeeId = 0, [FromQuery] long branchId = 0) =>
        Run(async () => Ok(await _repository.GetEmployeeMonthAsync(year, month, employeeId, branchId)), "The attendance of the month could not be loaded.");

    [HttpPut("month")]
    public Task<IActionResult> SaveMonth([FromBody] SaveEmployeeMonthDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add", "Update" },
            async () => Ok(await _repository.SaveEmployeeMonthAsync(dto ?? new SaveEmployeeMonthDto(), userId)),
            "The attendance could not be saved.");
    }

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", "HrAttendance")), "The attendance history could not be loaded.");
}


[ApiController]
[Route("api/human-resource-manangement/attendance-management/monthly-attendance")]
public class MonthlyAttendanceController
    : HrAttendanceControllerBase
{
    private readonly IAttendanceRepository _repository;

    public MonthlyAttendanceController(
        IAttendanceRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<MonthlyAttendanceController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/monthly-attendance";

    protected override string PageName => "Monthly Attendance";

    [HttpGet]
    public Task<IActionResult> Get([FromQuery] int year = 0, [FromQuery] int month = 0, [FromQuery] long branchId = 0) =>
        Run(async () => Ok(await _repository.GetMonthlyAsync(year, month, branchId)), "The attendance of the month could not be loaded.");
}


[ApiController]
[Route("api/human-resource-manangement/attendance-management/leave-applications")]
public class LeaveApplicationsController
    : HrAttendanceControllerBase
{
    private readonly ILeaveApplicationsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    public LeaveApplicationsController(
        ILeaveApplicationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<LeaveApplicationsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/leave-applications";

    protected override string PageName => "Leave Applications";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Leave applications could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The leave application lists could not be loaded.");

    [HttpGet("balance")]
    public Task<IActionResult> GetBalance([FromQuery] long employeeId, [FromQuery] string? date = null) =>
        Run(async () => Ok(await _repository.GetBalanceAsync(employeeId, date)), "The leave balance could not be loaded.");

    [HttpGet("days")]
    public Task<IActionResult> CountDays([FromQuery] long employeeId, [FromQuery] string? from, [FromQuery] string? to) =>
        Run(async () => Ok(await _repository.CountDaysAsync(employeeId, from ?? string.Empty, to ?? string.Empty)), "The leave days could not be counted.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", "HrLeaveApplications")), "The leave application history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The leave application could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveLeaveApplicationDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateAsync(dto ?? new SaveLeaveApplicationDto(), userId)),
            "The leave application could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveLeaveApplicationDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Update" },
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new SaveLeaveApplicationDto(), userId);
                return NoContent();
            },
            "The leave application could not be updated.");
    }

    [HttpPut("{publicId:guid}/approve")]
    public Task<IActionResult> Approve(Guid publicId, [FromBody] LeaveDecisionDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Approve" },
            async () =>
            {
                await _repository.ApproveAsync(publicId, dto ?? new LeaveDecisionDto(), userId);
                return NoContent();
            },
            "The leave application could not be approved.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}/reject")]
    public Task<IActionResult> Reject(Guid publicId, [FromBody] LeaveDecisionDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Approve" },
            async () =>
            {
                await _repository.RejectAsync(publicId, dto ?? new LeaveDecisionDto(), userId);
                return NoContent();
            },
            "The leave application could not be rejected.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}/cancel")]
    public Task<IActionResult> Cancel(Guid publicId, [FromBody] LeaveDecisionDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Approve" },
            async () =>
            {
                await _repository.CancelAsync(publicId, dto ?? new LeaveDecisionDto(), userId);
                return NoContent();
            },
            "The leave could not be cancelled.",
            StatusCodes.Status409Conflict);
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () =>
            {
                await _repository.DeleteAsync(publicId, userId);
                return NoContent();
            },
            "The leave application could not be deleted.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            new[] { "Restore" },
            async () =>
            {
                string? code = await _repository.RestoreAsync(userId);

                return code == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted leave application to restore.")
                    : Ok(new { Code = code, message = $"{code} restored." });
            },
            "The leave application could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
