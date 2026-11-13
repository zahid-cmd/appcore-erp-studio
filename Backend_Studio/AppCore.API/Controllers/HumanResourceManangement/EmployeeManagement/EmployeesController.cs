//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.HumanResourceManangement.EmployeeManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employees Controller : the Employee Profiles page (hand-written page : NEVER run Code Sync
// for it)
//
//   GET    ''             list
//   GET    defaults       next code + the form's lists
//   GET    history
//   GET    {publicId}     one employee in full
//   POST   ''             PUT {publicId}
//   DELETE {publicId}     PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/employee-management/employees")]
public class EmployeesController
    : ControllerBase
{
    private const string PageRoute =
        "/human-resource-manangement/%/employees";

    private readonly IEmployeesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<EmployeesController> _logger;

    private long UserId => this.CurrentUserId();

    public EmployeesController(
        IEmployeesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<EmployeesController> logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }

    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });

    private async Task<IActionResult> Run(Func<Task<IActionResult>> action, string failure, int ruleStatus = StatusCodes.Status400BadRequest)
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
            // HumanResource_Phase1_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);
            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }

    private async Task<IActionResult> Guarded(string activity, Func<Task<IActionResult>> action, string failure, int ruleStatus = StatusCodes.Status400BadRequest)
    {
        bool allowed =
            await _effectiveAccess.HasActivityAsync(UserId, PageRoute, activity);

        if (!allowed)
        {
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on Employee Profiles.");
        }

        return await Run(action, failure, ruleStatus);
    }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Employee profiles could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The employee form lists could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", "HrEmployees")), "The employee history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The employee could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] EmployeeDto? dto)
    {
        long userId = UserId;

        return Guarded("Add", async () => Ok(await _repository.CreateAsync(dto ?? new EmployeeDto(), userId)), "The employee could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] EmployeeDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new EmployeeDto(), userId);
                return NoContent();
            },
            "The employee could not be updated.");
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            "Delete",
            async () =>
            {
                await _repository.DeleteAsync(publicId, userId);
                return NoContent();
            },
            "The employee could not be deleted.",
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
                string? code = await _repository.RestoreAsync(userId);

                return code == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted employee to restore.")
                    : Ok(new { Code = code, message = $"{code} restored." });
            },
            "The employee could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
