//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Human Resource Setup controllers (hand-written pages : NEVER
// run Code Sync for them)
//
//   api/human-resource-manangement/human-resource-setup/shifts
//   api/human-resource-manangement/human-resource-setup/holidays
//   api/human-resource-manangement/human-resource-setup/leave-types
//   api/human-resource-manangement/human-resource-setup/salary-heads
//
// Each one :
//   GET    ''             list
//   GET    defaults       next code
//   GET    history
//   GET    {publicId}     one row
//   POST   ''             PUT {publicId}
//   DELETE {publicId}     PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

public abstract class HrSetupControllerBase<TDto>
    : ControllerBase
    where TDto : HrSetupDto, new()
{
    private readonly IHrSetupRepository<TDto> _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;

    // "/human-resource-manangement/%/shifts"
    protected abstract string PageRoute { get; }

    // "Shifts" (permission message), "shift" (failure messages)
    protected abstract string PageName { get; }

    protected abstract string RowName { get; }

    private long UserId => this.CurrentUserId();

    protected HrSetupControllerBase(
        IHrSetupRepository<TDto> repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
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
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on {PageName}.");
        }

        return await Run(action, failure, ruleStatus);
    }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), $"{PageName} could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), $"The {RowName} defaults could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", _repository.HistoryEntity)), $"The {RowName} history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), $"The {RowName} could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] TDto? dto)
    {
        long userId = UserId;

        return Guarded("Add", async () => Ok(await _repository.CreateAsync(dto ?? new TDto(), userId)), $"The {RowName} could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] TDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new TDto(), userId);
                return NoContent();
            },
            $"The {RowName} could not be updated.");
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
            $"The {RowName} could not be deleted.",
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
                    ? Fail(StatusCodes.Status404NotFound, $"There is no deleted {RowName} to restore.")
                    : Ok(new { Code = code, message = $"{code} restored." });
            },
            $"The {RowName} could not be restored.",
            StatusCodes.Status409Conflict);
    }
}


[ApiController]
[Route("api/human-resource-manangement/human-resource-setup/shifts")]
public class HrShiftsController
    : HrSetupControllerBase<HrShiftDto>
{
    public HrShiftsController(
        IHrSetupRepository<HrShiftDto> repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<HrShiftsController> logger)
        : base(repository, activityHistoryRepository, effectiveAccess, logger)
    {
    }

    protected override string PageRoute => "/human-resource-manangement/%/shifts";

    protected override string PageName => "Shifts";

    protected override string RowName => "shift";
}


[ApiController]
[Route("api/human-resource-manangement/human-resource-setup/holidays")]
public class HrHolidaysController
    : HrSetupControllerBase<HrHolidayDto>
{
    public HrHolidaysController(
        IHrSetupRepository<HrHolidayDto> repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<HrHolidaysController> logger)
        : base(repository, activityHistoryRepository, effectiveAccess, logger)
    {
    }

    protected override string PageRoute => "/human-resource-manangement/%/holidays";

    protected override string PageName => "Holidays";

    protected override string RowName => "holiday";
}


[ApiController]
[Route("api/human-resource-manangement/human-resource-setup/leave-types")]
public class HrLeaveTypesController
    : HrSetupControllerBase<HrLeaveTypeDto>
{
    public HrLeaveTypesController(
        IHrSetupRepository<HrLeaveTypeDto> repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<HrLeaveTypesController> logger)
        : base(repository, activityHistoryRepository, effectiveAccess, logger)
    {
    }

    protected override string PageRoute => "/human-resource-manangement/%/leave-types";

    protected override string PageName => "Leave Types";

    protected override string RowName => "leave type";
}


[ApiController]
[Route("api/human-resource-manangement/human-resource-setup/salary-heads")]
public class HrSalaryHeadsController
    : HrSetupControllerBase<HrSalaryHeadDto>
{
    public HrSalaryHeadsController(
        IHrSetupRepository<HrSalaryHeadDto> repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<HrSalaryHeadsController> logger)
        : base(repository, activityHistoryRepository, effectiveAccess, logger)
    {
    }

    protected override string PageRoute => "/human-resource-manangement/%/salary-heads";

    protected override string PageName => "Salary Heads";

    protected override string RowName => "salary head";
}
