//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.RegistrationManagement.RegistrationControl;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.RegistrationManagement.RegistrationControl;


//===============================================================
// Registration Configuration Controller (hand-written page, no
// Code Sync)
//
//   GET    ''                         every tab in one call
//   GET    defaults                   next codes / order
//   GET    history
//
//   POST   types                      PUT    types/{publicId}
//   DELETE types/{publicId}           PUT    types/restore
//   POST   fees                       PUT    fees/{publicId}
//   DELETE fees/{publicId}            PUT    fees/restore
//   POST   costs                      PUT    costs/{publicId}
//   DELETE costs/{publicId}           PUT    costs/restore
//   PUT    stages/{publicId}          (edit only)
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//===============================================================

[ApiController]
[Route("api/registration-management/registration-control/registration-configuration")]
public class RegistrationConfigurationController
    : ControllerBase
{
    private const string PageRoute =
        "/registration-management/%/registration-configuration";


    private readonly IRegistrationConfigurationRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<RegistrationConfigurationController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public RegistrationConfigurationController(
        IRegistrationConfigurationRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<RegistrationConfigurationController> logger)
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
                $"You do not have the \"{activity}\" permission on Registration Configuration.");
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
            // RegistrationConfiguration_Tables.sql
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
            "Registration configuration could not be loaded.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults()
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync()),
            "Registration configuration defaults could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Registration Management", "RegistrationConfiguration")),
            "Registration configuration history could not be loaded.");
    }



    //===========================================================
    // Registration Types
    //===========================================================

    [HttpPost("types")]
    public Task<IActionResult> CreateType([FromBody] SaveRegistrationTypeDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateTypeAsync(dto ?? new SaveRegistrationTypeDto(), userId)),
            "The registration type could not be saved.");
    }


    [HttpPut("types/{publicId:guid}")]
    public Task<IActionResult> UpdateType(Guid publicId, [FromBody] SaveRegistrationTypeDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateTypeAsync(publicId, dto ?? new SaveRegistrationTypeDto(), userId));
    }


    [HttpDelete("types/{publicId:guid}")]
    public Task<IActionResult> DeleteType(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeleteTypeAsync(publicId, userId));
    }


    [HttpPut("types/restore")]
    public Task<IActionResult> RestoreType()
    {
        long userId = UserId;

        return Restored(() => _repository.RestoreTypeAsync(userId), "There are no deleted registration types to restore.");
    }



    //===========================================================
    // Registration Fees
    //===========================================================

    [HttpPost("fees")]
    public Task<IActionResult> CreateFee([FromBody] SaveRegistrationFeeDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateFeeAsync(dto ?? new SaveRegistrationFeeDto(), userId)),
            "The registration fee could not be saved.");
    }


    [HttpPut("fees/{publicId:guid}")]
    public Task<IActionResult> UpdateFee(Guid publicId, [FromBody] SaveRegistrationFeeDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateFeeAsync(publicId, dto ?? new SaveRegistrationFeeDto(), userId));
    }


    [HttpDelete("fees/{publicId:guid}")]
    public Task<IActionResult> DeleteFee(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeleteFeeAsync(publicId, userId));
    }


    [HttpPut("fees/restore")]
    public Task<IActionResult> RestoreFee()
    {
        long userId = UserId;

        return Restored(() => _repository.RestoreFeeAsync(userId), "There are no deleted registration fees to restore.");
    }



    //===========================================================
    // Registration Costs
    //===========================================================

    [HttpPost("costs")]
    public Task<IActionResult> CreateCost([FromBody] SaveRegistrationCostDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateCostAsync(dto ?? new SaveRegistrationCostDto(), userId)),
            "The registration cost could not be saved.");
    }


    [HttpPut("costs/{publicId:guid}")]
    public Task<IActionResult> UpdateCost(Guid publicId, [FromBody] SaveRegistrationCostDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateCostAsync(publicId, dto ?? new SaveRegistrationCostDto(), userId));
    }


    [HttpDelete("costs/{publicId:guid}")]
    public Task<IActionResult> DeleteCost(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeleteCostAsync(publicId, userId));
    }


    [HttpPut("costs/restore")]
    public Task<IActionResult> RestoreCost()
    {
        long userId = UserId;

        return Restored(() => _repository.RestoreCostAsync(userId), "There are no deleted registration costs to restore.");
    }



    //===========================================================
    // Stage Timings (edit only)
    //===========================================================

    [HttpPut("stages/{publicId:guid}")]
    public Task<IActionResult> UpdateStage(Guid publicId, [FromBody] SaveRegistrationStageTimingDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateStageAsync(publicId, dto ?? new SaveRegistrationStageTimingDto(), userId));
    }
}
