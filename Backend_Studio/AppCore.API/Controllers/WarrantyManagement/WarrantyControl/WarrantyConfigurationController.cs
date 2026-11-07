//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.WarrantyManagement.WarrantyControl;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.WarrantyManagement.WarrantyControl;


//===============================================================
// Warranty Configuration Controller (hand-written page, no
// Code Sync)
//
//   GET    ''                              every tab in one call
//   GET    defaults                        next codes / order
//   GET    history
//
//   POST   parts                           PUT    parts/{publicId}
//   DELETE parts/{publicId}                PUT    parts/restore
//   POST   policies                        PUT    policies/{publicId}
//   DELETE policies/{publicId}             PUT    policies/restore
//   POST   coverages                       PUT    coverages/{publicId}
//   DELETE coverages/{publicId}            PUT    coverages/restore
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//===============================================================

[ApiController]
[Route("api/warranty-management/warranty-control/warranty-configuration")]
public class WarrantyConfigurationController
    : ControllerBase
{
    private const string PageRoute =
        "/warranty-management/%/warranty-configuration";


    private readonly IWarrantyConfigurationRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<WarrantyConfigurationController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public WarrantyConfigurationController(
        IWarrantyConfigurationRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<WarrantyConfigurationController> logger)
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
                $"You do not have the \"{activity}\" permission on Warranty Configuration.");
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
            // Usually the tables are missing : run
            // WarrantyConfiguration_Tables.sql
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


    private Task<IActionResult> Restored
    (
        Func<Task<bool>> restore,
        string emptyMessage
    )
    {
        return Guarded(
            "Restore",
            async () =>
                await restore()
                    ? (IActionResult)NoContent()
                    : Fail(StatusCodes.Status404NotFound, emptyMessage),
            "The record could not be restored.",
            StatusCodes.Status409Conflict);
    }


    private Task<IActionResult> Deleted
    (
        Func<Task> delete
    )
    {
        return Guarded(
            "Delete",
            async () =>
            {
                await delete();

                return NoContent();
            },
            "The record could not be deleted.",
            StatusCodes.Status409Conflict);
    }


    private Task<IActionResult> Updated
    (
        Func<Task> update
    )
    {
        return Guarded(
            "Update",
            async () =>
            {
                await update();

                return NoContent();
            },
            "The record could not be updated.");
    }



    //===========================================================
    // Read
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync()),
            "Warranty configuration could not be loaded.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults()
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync()),
            "Warranty configuration defaults could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Warranty Management", "WarrantyConfiguration")),
            "Warranty configuration history could not be loaded.");
    }



    //===========================================================
    // Warranty Parts
    //===========================================================

    [HttpPost("parts")]
    public Task<IActionResult> CreatePart([FromBody] SaveWarrantyPartDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreatePartAsync(dto ?? new SaveWarrantyPartDto(), userId)),
            "The warranty part could not be saved.");
    }


    [HttpPut("parts/{publicId:guid}")]
    public Task<IActionResult> UpdatePart(Guid publicId, [FromBody] SaveWarrantyPartDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdatePartAsync(publicId, dto ?? new SaveWarrantyPartDto(), userId));
    }


    [HttpDelete("parts/{publicId:guid}")]
    public Task<IActionResult> DeletePart(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeletePartAsync(publicId, userId));
    }


    [HttpPut("parts/restore")]
    public Task<IActionResult> RestorePart()
    {
        long userId = UserId;

        return Restored(() => _repository.RestorePartAsync(userId), "There are no deleted warranty parts to restore.");
    }



    //===========================================================
    // Warranty Policies
    //===========================================================

    [HttpPost("policies")]
    public Task<IActionResult> CreatePolicy([FromBody] SaveWarrantyPolicyDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreatePolicyAsync(dto ?? new SaveWarrantyPolicyDto(), userId)),
            "The warranty policy could not be saved.");
    }


    [HttpPut("policies/{publicId:guid}")]
    public Task<IActionResult> UpdatePolicy(Guid publicId, [FromBody] SaveWarrantyPolicyDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdatePolicyAsync(publicId, dto ?? new SaveWarrantyPolicyDto(), userId));
    }


    [HttpDelete("policies/{publicId:guid}")]
    public Task<IActionResult> DeletePolicy(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeletePolicyAsync(publicId, userId));
    }


    [HttpPut("policies/restore")]
    public Task<IActionResult> RestorePolicy()
    {
        long userId = UserId;

        return Restored(() => _repository.RestorePolicyAsync(userId), "There are no deleted warranty policies to restore.");
    }



    //===========================================================
    // Warranty Coverages
    //===========================================================

    [HttpPost("coverages")]
    public Task<IActionResult> CreateCoverage([FromBody] SaveWarrantyCoverageDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateCoverageAsync(dto ?? new SaveWarrantyCoverageDto(), userId)),
            "The warranty coverage could not be saved.");
    }


    [HttpPut("coverages/{publicId:guid}")]
    public Task<IActionResult> UpdateCoverage(Guid publicId, [FromBody] SaveWarrantyCoverageDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateCoverageAsync(publicId, dto ?? new SaveWarrantyCoverageDto(), userId));
    }


    [HttpDelete("coverages/{publicId:guid}")]
    public Task<IActionResult> DeleteCoverage(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeleteCoverageAsync(publicId, userId));
    }


    [HttpPut("coverages/restore")]
    public Task<IActionResult> RestoreCoverage()
    {
        long userId = UserId;

        return Restored(() => _repository.RestoreCoverageAsync(userId), "There are no deleted warranty coverages to restore.");
    }
}
