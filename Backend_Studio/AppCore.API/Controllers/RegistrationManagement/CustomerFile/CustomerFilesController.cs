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
// Customer Files Controller (hand-written page, no Code Sync)
// Tabs : File Register / Name Transfer / Fees Collection
//
//   GET    ''                                 files + transfers
//   GET    defaults                           next numbers, bikes,
//                                             customers, documents
//   GET    history                            page history
//   GET    history/{customerFileId}           one file's history
//   GET    {publicId}/transfer-quote?date=    policy in force
//
//   POST   opening-files                      PUT opening-files/{publicId}
//   PUT    {publicId}/status                  { Status, Date }
//   POST   name-transfers                     DELETE name-transfers/{publicId}
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (cancel refused), 500 (with
// the database's reason)
//===============================================================

[ApiController]
[Route("api/registration-management/customer-file/customer-files")]
public class CustomerFilesController
    : ControllerBase
{
    private const string PageRoute =
        "/registration-management/%/customer-files";


    private readonly ICustomerFilesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<CustomerFilesController> _logger;


    // Logged-in user / branch (token)
    private long UserId => this.CurrentUserId();

    private long BranchId => this.CurrentBranchId() ?? 0;


    public CustomerFilesController(
        ICustomerFilesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<CustomerFilesController> logger)
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
                $"You do not have the \"{activity}\" permission on Customer Files.");
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
            // CustomerFiles_Tables.sql
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



    //===========================================================
    // Read
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync()),
            "Customer files could not be loaded.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults()
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync()),
            "Customer file defaults could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Registration Management", "CustomerFile")),
            "Customer file history could not be loaded.");
    }


    [HttpGet("history/{customerFileId:long}")]
    public Task<IActionResult> GetFileHistory(long customerFileId)
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Registration Management", "CustomerFile", customerFileId)),
            "Customer file history could not be loaded.");
    }


    [HttpGet("{publicId:guid}/transfer-quote")]
    public Task<IActionResult> GetTransferQuote(Guid publicId, [FromQuery] string? date)
    {
        return Run(
            async () => Ok(await _repository.GetTransferQuoteAsync(publicId, date)),
            "The name transfer policy could not be loaded.");
    }



    //===========================================================
    // Opening files / status
    //===========================================================

    [HttpPost("opening-files")]
    public Task<IActionResult> CreateOpeningFile([FromBody] SaveOpeningFileDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateOpeningFileAsync(dto ?? new SaveOpeningFileDto(), branchId, userId)),
            "The opening file could not be saved.");
    }


    [HttpPut("opening-files/{publicId:guid}")]
    public Task<IActionResult> UpdateOpeningFile(Guid publicId, [FromBody] SaveOpeningFileDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateOpeningFileAsync(publicId, dto ?? new SaveOpeningFileDto(), userId);

                return NoContent();
            },
            "The opening file could not be updated.");
    }


    [HttpPut("{publicId:guid}/status")]
    public Task<IActionResult> SetStatus(Guid publicId, [FromBody] SetCustomerFileStatusDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.SetStatusAsync(publicId, dto ?? new SetCustomerFileStatusDto(), userId);

                return NoContent();
            },
            "The status could not be changed.");
    }



    //===========================================================
    // Name transfers
    //===========================================================

    [HttpPost("name-transfers")]
    public Task<IActionResult> CreateNameTransfer([FromBody] SaveNameTransferDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateNameTransferAsync(dto ?? new SaveNameTransferDto(), userId)),
            "The name transfer could not be saved.");
    }


    [HttpDelete("name-transfers/{publicId:guid}")]
    public Task<IActionResult> CancelNameTransfer(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            "Delete",
            async () =>
            {
                await _repository.CancelNameTransferAsync(publicId, userId);

                return NoContent();
            },
            "The name transfer could not be cancelled.",
            StatusCodes.Status409Conflict);
    }
}
