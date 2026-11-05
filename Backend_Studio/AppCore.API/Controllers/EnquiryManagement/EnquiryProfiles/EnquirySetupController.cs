//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Setup Controller (hand-written page, no Code Sync)
//
//   GET    ?setupType=              live rows ('' = every list)
//   GET    defaults?setupType=      next code / display order
//   GET    {id}
//   POST   ''                       (Add)
//   PUT    ''                       (Update)
//   DELETE {id}                     (Delete; 409 system / default)
//   PUT    restore?setupType=       latest deleted of the list
//                                   (Restore)
//   GET    history
//
// setupType : Source / Status / InterestLevel / FollowUpMethod /
// LostReason
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//===============================================================

[ApiController]
[Route("api/enquiry-management/enquiry-profiles/enquiry-setup")]
public class EnquirySetupController
    : ControllerBase
{
    private const string PageRoute =
        "/enquiry-management/%/enquiry-setup";


    private readonly IEnquirySetupRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<EnquirySetupController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public EnquirySetupController(
        IEnquirySetupRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<EnquirySetupController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }



    //===========================================================
    // Answers : { message }
    //===========================================================

    private ObjectResult Fail
    (
        int statusCode,
        string message
    )
    {
        return StatusCode(
            statusCode,
            new { message });
    }



    //===========================================================
    // Permission : null when allowed, else the 403 answer
    //===========================================================

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
                $"You do not have the \"{activity}\" permission on Enquiry Setup.");
    }



    //===========================================================
    // Run an action with the standard error answers
    //===========================================================

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
            // Usually the table is missing : run
            // EnquirySetup_Tables.sql
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
    public Task<IActionResult> GetAll(
        [FromQuery] string? setupType)
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync(setupType)),
            "Enquiry setup could not be loaded.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] string? setupType)
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(setupType ?? string.Empty)),
            "Enquiry setup defaults could not be loaded.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Enquiry Management", "EnquirySetups")),
            "Enquiry setup history could not be loaded.");
    }


    [HttpGet("{id:long}")]
    public Task<IActionResult> GetById(
        long id)
    {
        return Run(
            async () =>
            {
                EnquirySetupDto? row =
                    await _repository.GetByIdAsync(id);

                return row == null
                    ? Fail(StatusCodes.Status404NotFound, "The record was not found.")
                    : Ok(row);
            },
            "The record could not be loaded.");
    }



    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateEnquirySetupDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateEnquirySetupDto(), userId)),
            "The record could not be saved.");
    }


    [HttpPut]
    public Task<IActionResult> Update(
        [FromBody] UpdateEnquirySetupDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(dto ?? new UpdateEnquirySetupDto(), userId);

                return NoContent();
            },
            "The record could not be updated.");
    }


    [HttpDelete("{id:long}")]
    public Task<IActionResult> Delete(
        long id)
    {
        long userId = UserId;

        return Guarded(
            "Delete",
            async () =>
            {
                await _repository.DeleteAsync(id, userId);

                return NoContent();
            },
            "The record could not be deleted.",
            StatusCodes.Status409Conflict);
    }


    [HttpPut("restore")]
    public Task<IActionResult> Restore(
        [FromQuery] string? setupType)
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
            {
                bool restored =
                    await _repository.RestoreAsync(setupType, userId);

                return restored
                    ? (IActionResult)NoContent()
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted records in this list to restore.");
            },
            "The record could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
