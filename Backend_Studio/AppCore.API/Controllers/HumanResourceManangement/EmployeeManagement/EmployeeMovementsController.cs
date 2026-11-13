//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.HumanResourceManangement.EmployeeManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employee Movements Controller (hand-written page : NEVER run
// Code Sync for it; tables made by
// HumanResource_Phase4_Engine.sql)
//
//   GET    ''                   list
//   GET    defaults             next code + the form's lists
//   GET    employee/{id}        the employee as now
//   GET    history
//   GET    {publicId}           one movement in full
//   POST   ''                   save (changes the employee)
//   DELETE {publicId}           take the latest movement back
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/employee-management/employee-movements")]
public class EmployeeMovementsController
    : HrAttendanceControllerBase
{
    private readonly IEmployeeMovementsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    public EmployeeMovementsController(
        IEmployeeMovementsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<EmployeeMovementsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/employee-movements";

    protected override string PageName => "Employee Movements";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Employee movements could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The employee movement lists could not be loaded.");

    [HttpGet("employee/{employeeId:long}")]
    public Task<IActionResult> GetEmployeeState(long employeeId) =>
        Run(async () => Ok(await _repository.GetEmployeeStateAsync(employeeId)), "The employee could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", "HrEmployeeMovements")), "The employee movement history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The employee movement could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] EmployeeMovementDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateAsync(dto ?? new EmployeeMovementDto(), userId)),
            "The employee movement could not be saved.");
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
            "The employee movement could not be deleted.",
            StatusCodes.Status409Conflict);
    }
}
