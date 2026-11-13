//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Settings.GeneralSettings;


//===============================================================
// Terms & Conditions Controller (hand-written page : NEVER run
// Code Sync for it)
//
//   GET    ''                    list
//   GET    defaults              next code, operations (+ Default)
//   GET    default/{operation}   the operation's Default set (204 = none)
//   GET    history
//   GET    {publicId}            one set in full
//   POST   ''                    PUT {publicId}
//   DELETE {publicId}            PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/settings/general-settings/terms-conditions")]
public class TermsConditionsController
    : ControllerBase
{
    private const string PageRoute =
        "/settings/%/terms-conditions";

    private readonly ITermsConditionsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<TermsConditionsController> _logger;

    private long UserId => this.CurrentUserId();

    public TermsConditionsController(
        ITermsConditionsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<TermsConditionsController> logger)
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
            // TermsConditions_Engine.sql
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
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on Terms & Conditions.");
        }

        return await Run(action, failure, ruleStatus);
    }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Terms & conditions could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "Terms & conditions defaults could not be loaded.");

    [HttpGet("default/{operationCode}")]
    public Task<IActionResult> GetDefaultFor(string operationCode) =>
        Run(
            async () =>
            {
                TermsConditionSetDto? set = await _repository.GetDefaultForAsync(operationCode);
                return set == null ? NoContent() : Ok(set);
            },
            "The default terms could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Settings", "TermsConditions")), "Terms & conditions history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The terms & conditions set could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveTermsConditionSetDto? dto)
    {
        long userId = UserId;

        return Guarded("Add", async () => Ok(await _repository.CreateAsync(dto ?? new SaveTermsConditionSetDto(), userId)), "The terms & conditions set could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveTermsConditionSetDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new SaveTermsConditionSetDto(), userId);
                return NoContent();
            },
            "The terms & conditions set could not be updated.");
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
            "The terms & conditions set could not be deleted.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
                await _repository.RestoreAsync(userId)
                    ? NoContent()
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted terms & conditions sets to restore."),
            "The terms & conditions set could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
