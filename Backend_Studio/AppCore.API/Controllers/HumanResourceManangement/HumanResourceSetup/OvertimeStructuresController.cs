//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Overtime Structures Controller (hand-written page : NEVER run
// Code Sync for it; tables made by
// HumanResource_OvertimeStructures_Engine.sql)
//
//   GET    ''             list
//   GET    defaults       next code and name
//   GET    history
//   GET    {publicId}     one structure
//   POST   ''             PUT {publicId}
//   DELETE {publicId}     PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/human-resource-setup/overtime-structures")]
public class OvertimeStructuresController
    : HrAttendanceControllerBase
{
    private readonly IOvertimeStructuresRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    public OvertimeStructuresController(
        IOvertimeStructuresRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<OvertimeStructuresController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/overtime-structures";

    protected override string PageName => "Overtime Structures";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Overtime structures could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The overtime structure defaults could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", "HrOvertimeStructures")), "The overtime structure history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The overtime structure could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] OvertimeStructureDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateAsync(dto ?? new OvertimeStructureDto(), userId)),
            "The overtime structure could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] OvertimeStructureDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Update" },
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new OvertimeStructureDto(), userId);
                return NoContent();
            },
            "The overtime structure could not be updated.");
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
            "The overtime structure could not be deleted.",
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
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted overtime structure to restore.")
                    : Ok(new { Code = code, message = $"{code} restored." });
            },
            "The overtime structure could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
