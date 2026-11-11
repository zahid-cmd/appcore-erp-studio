//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Settings.ServiceSettings;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Settings.ServiceSettings;


//===============================================================
// PDI Templates Controller (hand-written page; replaces the
// generated one : NEVER run Code Sync for it again)
//
//   GET    ''               list
//   GET    defaults         next code, bike models (+ template)
//   GET    history
//   GET    {publicId}       one template in full
//   POST   ''               PUT {publicId}
//   DELETE {publicId}       PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/settings/service-settings/pdi-templates")]
public class PdiTemplatesController
    : ControllerBase
{
    private const string PageRoute =
        "/settings/%/pdi-templates";

    private readonly IPdiTemplatesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<PdiTemplatesController> _logger;

    private long UserId => this.CurrentUserId();

    public PdiTemplatesController(
        IPdiTemplatesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PdiTemplatesController> logger)
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
            // BikeDeliveries_Pdi_Engine.sql
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
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on PDI Templates.");
        }

        return await Run(action, failure, ruleStatus);
    }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "PDI templates could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "PDI template defaults could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Settings", "PdiTemplates")), "PDI template history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The PDI template could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SavePdiTemplateDto? dto)
    {
        long userId = UserId;

        return Guarded("Add", async () => Ok(await _repository.CreateAsync(dto ?? new SavePdiTemplateDto(), userId)), "The PDI template could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SavePdiTemplateDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new SavePdiTemplateDto(), userId);
                return NoContent();
            },
            "The PDI template could not be updated.");
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
            "The PDI template could not be deleted.",
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
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted PDI templates to restore."),
            "The PDI template could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
