//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.MembershipManagement.MembershipAssignment;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Fees Collection (hand-written page, 2026-11-11; NO
// Code Sync)
//
//   GET  ''                      to collect + collections
//   GET  history/{feeId}         one collection's history
//   POST collect                 Payment Desk -> Receipt Voucher
//                                (activity Add)
//   PUT  {publicId}/cancel       cancel an unused collection
//                                (activity Cancel)
//   PUT  {publicId}/refund       refund a cancelled, unused
//                                membership to the customer's
//                                ledger (activity Refund)
//===============================================================

[ApiController]
[Route("api/membership-management/membership-assignment/membership-fees-collection")]
public class MembershipFeesCollectionController
    : ControllerBase
{
    private const string PageRoute =
        "/membership-management/%/membership-fees-collection";


    private readonly IMembershipFeesCollectionRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<MembershipFeesCollectionController> _logger;


    private long UserId => this.CurrentUserId();

    private long BranchId => this.CurrentBranchId() ?? 0;


    public MembershipFeesCollectionController(
        IMembershipFeesCollectionRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<MembershipFeesCollectionController> logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }


    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });


    private async Task<IActionResult> Run
    (
        string? activity,
        Func<Task<IActionResult>> action,
        string failure
    )
    {
        if (activity != null && !await _effectiveAccess.HasActivityAsync(UserId, PageRoute, activity))
        {
            return Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on Membership Fees Collection.");
        }

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
            // Usually the table is missing : run MembershipFees_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }


    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            null,
            async () => Ok(await _repository.GetAllAsync(BranchId)),
            "The membership fees could not be loaded.");
    }


    [HttpGet("history/{id:long}")]
    public Task<IActionResult> GetHistory(long id)
    {
        return Run(
            null,
            async () => Ok(await _activityHistoryRepository.GetHistoryAsync("Membership Management", "Membership Fee", id)),
            "The history could not be loaded.");
    }


    [HttpPost("collect")]
    public Task<IActionResult> Collect([FromBody] CollectMembershipFeeDto? dto)
    {
        return Run(
            "Add",
            async () => Ok(await _repository.CollectAsync(dto ?? new CollectMembershipFeeDto(), BranchId, UserId)),
            "The fee could not be collected.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public Task<IActionResult> Cancel(Guid publicId, [FromBody] MembershipFeeReasonDto? dto)
    {
        return Run(
            "Cancel",
            async () => Ok(await _repository.CancelCollectionAsync(publicId, dto ?? new MembershipFeeReasonDto(), UserId)),
            "The collection could not be cancelled.");
    }


    [HttpPut("{publicId:guid}/refund")]
    public Task<IActionResult> Refund(Guid publicId, [FromBody] MembershipFeeReasonDto? dto)
    {
        return Run(
            "Refund",
            async () => Ok(await _repository.RefundAsync(publicId, dto ?? new MembershipFeeReasonDto(), BranchId, UserId)),
            "The fee could not be refunded.");
    }
}
