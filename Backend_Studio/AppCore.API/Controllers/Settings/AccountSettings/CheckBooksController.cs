//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Settings.AccountSettings.CheckBooks;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Settings.AccountSettings;


//===============================================================
// Check Books Controller (hand-written page : NEVER run Code Sync
// for it)
//
//   GET    ''                              list
//   GET    defaults                        next code, bank accounts,
//                                          switches
//   GET    available-leaves/{bankAccountId} unused leaves (vouchers)
//   GET    history
//   GET    {publicId}                      one book with its leaves
//   POST   ''                              PUT {publicId}
//   DELETE {publicId}                      PUT restore
//   PUT    {publicId}/leaves/{leafId}/mark  Cancelled / Lost
//   PUT    {publicId}/leaves/{leafId}/undo  back to Unused
//   GET    print-layouts?accountIds=1,2     cheque print layouts
//   PUT    print-layouts/{bankAccountId}    save one (Update)
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/settings/account-settings/check-books")]
public class CheckBooksController
    : ControllerBase
{
    private const string PageRoute =
        "/settings/%/check-books";

    private readonly ICheckBooksRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<CheckBooksController> _logger;

    private long UserId => this.CurrentUserId();

    public CheckBooksController(
        ICheckBooksRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<CheckBooksController> logger)
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
            // CheckBooks_Engine.sql
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
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on Check Books.");
        }

        return await Run(action, failure, ruleStatus);
    }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "The check books could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The check book defaults could not be loaded.");

    [HttpGet("available-leaves/{bankAccountId:long}")]
    public Task<IActionResult> GetAvailableLeaves(long bankAccountId, [FromQuery] int take = 50) =>
        Run(async () => Ok(await _repository.GetAvailableLeavesAsync(bankAccountId, take)), "The check leaves could not be loaded.");

    [HttpGet("print-layouts")]
    public Task<IActionResult> GetPrintLayouts([FromQuery] string? accountIds)
    {
        List<long> ids =
            (accountIds ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(x => long.TryParse(x, out long id) ? id : 0)
                .Where(x => x > 0)
                .ToList();

        // Run the CheckPrintLayouts_Engine.sql script when this fails
        return Run(async () => Ok(await _repository.GetPrintLayoutsAsync(ids)), "The cheque print layouts could not be loaded.");
    }

    [HttpPut("print-layouts/{bankAccountId:long}")]
    public Task<IActionResult> SavePrintLayout(long bankAccountId, [FromBody] SaveCheckPrintLayoutDto? dto)
    {
        long userId = UserId;
        return Guarded("Update", async () => Ok(await _repository.SavePrintLayoutAsync(bankAccountId, dto ?? new SaveCheckPrintLayoutDto(), userId)), "The cheque print layout could not be saved.");
    }

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Settings", "CheckBooks")), "The check book history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The check book could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveCheckBookDto? dto)
    {
        long userId = UserId;

        return Guarded("Add", async () => Ok(await _repository.CreateAsync(dto ?? new SaveCheckBookDto(), userId)), "The check book could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveCheckBookDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new SaveCheckBookDto(), userId);
                return NoContent();
            },
            "The check book could not be updated.");
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
            "The check book could not be deleted.",
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
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted check books to restore."),
            "The check book could not be restored.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}/leaves/{leafId:long}/mark")]
    public Task<IActionResult> MarkLeaf(Guid publicId, long leafId, [FromBody] CheckBookLeafActionDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.MarkLeafAsync(publicId, leafId, dto ?? new CheckBookLeafActionDto(), userId);
                return NoContent();
            },
            "The check leaf could not be changed.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}/leaves/{leafId:long}/undo")]
    public Task<IActionResult> UndoLeaf(Guid publicId, long leafId)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UndoLeafAsync(publicId, leafId, userId);
                return NoContent();
            },
            "The check leaf could not be changed.",
            StatusCodes.Status409Conflict);
    }
}
