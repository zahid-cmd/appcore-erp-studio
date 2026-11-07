//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.RegistrationManagement.CustomerFile;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.RegistrationManagement.CustomerFile;


//===============================================================
// Customer File Configuration Controller (hand-written page, no
// Code Sync)
//
//   GET    ''                                every list in one call
//   GET    defaults                          next codes / order
//   GET    history
//
//   POST   name-transfer-rules               PUT    name-transfer-rules/{publicId}
//   DELETE name-transfer-rules/{publicId}    PUT    name-transfer-rules/restore
//   POST   delivery-rules                    PUT    delivery-rules/{publicId}
//   DELETE delivery-rules/{publicId}         PUT    delivery-rules/restore
//   POST   documents                         PUT    documents/{publicId}
//   DELETE documents/{publicId}              PUT    documents/restore?documentFor=
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//===============================================================

[ApiController]
[Route("api/registration-management/customer-file/customer-file-configuration")]
public class CustomerFileConfigurationController
    : ControllerBase
{
    private const string PageRoute =
        "/registration-management/%/customer-file-configuration";


    private readonly ICustomerFileConfigurationRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<CustomerFileConfigurationController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public CustomerFileConfigurationController(
        ICustomerFileConfigurationRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<CustomerFileConfigurationController> logger)
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
                $"You do not have the \"{activity}\" permission on Customer File Configuration.");
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
            // CustomerFileConfiguration_Tables.sql
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
            "Customer file configuration could not be loaded.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults()
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync()),
            "Customer file configuration defaults could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Registration Management", "CustomerFileConfiguration")),
            "Customer file configuration history could not be loaded.");
    }



    //===========================================================
    // Name Transfer rules
    //===========================================================

    [HttpPost("name-transfer-rules")]
    public Task<IActionResult> CreateNameTransferRule([FromBody] SaveNameTransferRuleDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateNameTransferRuleAsync(dto ?? new SaveNameTransferRuleDto(), userId)),
            "The name transfer rule could not be saved.");
    }


    [HttpPut("name-transfer-rules/{publicId:guid}")]
    public Task<IActionResult> UpdateNameTransferRule(Guid publicId, [FromBody] SaveNameTransferRuleDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateNameTransferRuleAsync(publicId, dto ?? new SaveNameTransferRuleDto(), userId));
    }


    [HttpDelete("name-transfer-rules/{publicId:guid}")]
    public Task<IActionResult> DeleteNameTransferRule(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeleteNameTransferRuleAsync(publicId, userId));
    }


    [HttpPut("name-transfer-rules/restore")]
    public Task<IActionResult> RestoreNameTransferRule()
    {
        long userId = UserId;

        return Restored(() => _repository.RestoreNameTransferRuleAsync(userId), "There are no deleted name transfer rules to restore.");
    }



    //===========================================================
    // File Delivery rules
    //===========================================================

    [HttpPost("delivery-rules")]
    public Task<IActionResult> CreateDeliveryRule([FromBody] SaveDeliveryRuleDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateDeliveryRuleAsync(dto ?? new SaveDeliveryRuleDto(), userId)),
            "The file delivery rule could not be saved.");
    }


    [HttpPut("delivery-rules/{publicId:guid}")]
    public Task<IActionResult> UpdateDeliveryRule(Guid publicId, [FromBody] SaveDeliveryRuleDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateDeliveryRuleAsync(publicId, dto ?? new SaveDeliveryRuleDto(), userId));
    }


    [HttpDelete("delivery-rules/{publicId:guid}")]
    public Task<IActionResult> DeleteDeliveryRule(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeleteDeliveryRuleAsync(publicId, userId));
    }


    [HttpPut("delivery-rules/restore")]
    public Task<IActionResult> RestoreDeliveryRule()
    {
        long userId = UserId;

        return Restored(() => _repository.RestoreDeliveryRuleAsync(userId), "There are no deleted file delivery rules to restore.");
    }



    //===========================================================
    // Required documents
    //===========================================================

    [HttpPost("documents")]
    public Task<IActionResult> CreateDocument([FromBody] SaveCustomerFileDocumentDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateDocumentAsync(dto ?? new SaveCustomerFileDocumentDto(), userId)),
            "The document could not be saved.");
    }


    [HttpPut("documents/{publicId:guid}")]
    public Task<IActionResult> UpdateDocument(Guid publicId, [FromBody] SaveCustomerFileDocumentDto? dto)
    {
        long userId = UserId;

        return Updated(() => _repository.UpdateDocumentAsync(publicId, dto ?? new SaveCustomerFileDocumentDto(), userId));
    }


    [HttpDelete("documents/{publicId:guid}")]
    public Task<IActionResult> DeleteDocument(Guid publicId)
    {
        long userId = UserId;

        return Deleted(() => _repository.DeleteDocumentAsync(publicId, userId));
    }


    [HttpPut("documents/restore")]
    public Task<IActionResult> RestoreDocument([FromQuery] string? documentFor)
    {
        long userId = UserId;

        return Restored(() => _repository.RestoreDocumentAsync(documentFor, userId), "There are no deleted documents in this list to restore.");
    }
}
