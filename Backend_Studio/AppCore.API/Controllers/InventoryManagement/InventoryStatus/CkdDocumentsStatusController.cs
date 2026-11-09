//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.InventoryManagement.CkdDocuments;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.InventoryStatus;


//===============================================================
// CKD Documents Status Controller (hand-written page, no Code
// Sync) : Inventory Management > Inventory Status
//
//   GET    ''                          every chassis
//   GET    history                     page history
//   GET    history/unit/{id}           one bike's history
//   GET    history/file/{id}           one opening file's history
//   PUT    units/{id}                  { CkdStatus, Remarks }
//   PUT    files/{publicId}            { CkdStatus, Remarks }
//
// Errors : { message } with 400 / 403 / 404 / 500
//===============================================================

[ApiController]
[Route("api/inventory-management/inventory-status/ckd-documents-status")]
public class CkdDocumentsStatusController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/ckd-documents-status";


    private readonly ICkdDocumentsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<CkdDocumentsStatusController> _logger;


    private long UserId => this.CurrentUserId();

    private string UserName => this.CurrentUserName();


    public CkdDocumentsStatusController(
        ICkdDocumentsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<CkdDocumentsStatusController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }



    //===========================================================
    // Answers / permission / standard errors
    //===========================================================

    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });


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
                $"You do not have the \"{activity}\" permission on CKD Documents Status.");
    }


    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> action,
        string failure
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
            return Fail(StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            // Usually the columns are missing : run
            // CkdDocuments_Status.sql
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
        string failure
    )
    {
        IActionResult? denied =
            await DenyAsync(activity);

        return denied ?? await Run(action, failure);
    }



    //===========================================================
    // Read
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync()),
            "CKD documents status could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync(CkdHistory.Module, CkdHistory.UnitEntity)),
            "CKD documents history could not be loaded.");
    }


    [HttpGet("history/unit/{id:long}")]
    public Task<IActionResult> GetUnitHistory(long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync(CkdHistory.Module, CkdHistory.UnitEntity, id)),
            "CKD documents history could not be loaded.");
    }


    [HttpGet("history/file/{id:long}")]
    public Task<IActionResult> GetFileHistory(long id)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync(CkdHistory.Module, CkdHistory.FileEntity, id)),
            "CKD documents history could not be loaded.");
    }



    //===========================================================
    // Change
    //===========================================================

    [HttpPut("units/{id:long}")]
    public Task<IActionResult> SetUnit(long id, [FromBody] SetCkdStatusDto? dto)
    {
        long userId = UserId;

        string userName = UserName;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.SetUnitStatusAsync(id, dto ?? new SetCkdStatusDto(), userId, userName);

                return NoContent();
            },
            "The CKD status could not be changed.");
    }


    [HttpPut("files/{publicId:guid}")]
    public Task<IActionResult> SetFile(Guid publicId, [FromBody] SetCkdStatusDto? dto)
    {
        long userId = UserId;

        string userName = UserName;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.SetFileStatusAsync(publicId, dto ?? new SetCkdStatusDto(), userId, userName);

                return NoContent();
            },
            "The CKD status could not be changed.");
    }
}
