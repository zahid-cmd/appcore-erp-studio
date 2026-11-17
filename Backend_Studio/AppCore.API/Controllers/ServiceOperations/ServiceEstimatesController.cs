//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.ServiceOperations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.ServiceOperations;


//===============================================================
// Service Operations, service estimates (hand-written page : NEVER
// run Code Sync for it; tables made by ServiceOperations_Estimates_
// Engine.sql)
//
//   api/service-operations/workshop-management/service-estimates
//       GET ''                       the list (heads)
//       GET lookups                  the lists of the form
//       GET parts                    spare parts with price and stock
//       GET draft/{jobCardPublicId}  a new estimate of a job card
//       GET history
//       GET {publicId}               POST ''   PUT {publicId}
//       PUT {publicId}/status        Sent / Approved / Rejected
//       POST {publicId}/revise       a new version
//       DELETE {publicId}            PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/service-estimates")]
public class ServiceEstimatesController
    : WsControllerBase
{
    private readonly IServiceEstimatesRepository _repository;

    public ServiceEstimatesController(IServiceEstimatesRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<ServiceEstimatesController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/service-estimates";

    protected override string PageName => "Service Estimates";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAllAsync()), "Estimates could not be loaded.");

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(async () => Ok(await _repository.GetLookupsAsync()), "The estimate lists could not be loaded.");

    [HttpGet("parts")]
    public Task<IActionResult> GetParts([FromQuery] long? branchId) =>
        Run(async () => Ok(await _repository.GetPartsAsync(branchId)), "The parts could not be loaded.");

    // The number a new estimate of the service center would get
    [HttpGet("next-no")]
    public Task<IActionResult> GetNextNo([FromQuery] long branchId, [FromQuery] string? date) =>
        Run(async () => Ok(new { EstimateNo = await _repository.PeekNoAsync(branchId, date) }), "The estimate number could not be read.");

    // The Estimate Charge is collected (a Receipt Voucher is posted)
    [HttpPost("{publicId:guid}/collect-charge")]
    public Task<IActionResult> CollectCharge(Guid publicId, [FromBody] CollectEstimateChargeDto? dto) =>
        Save("Update", userId => _repository.CollectChargeAsync(publicId, dto ?? new CollectEstimateChargeDto(), userId), "The Estimate Charge could not be collected.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("ServiceEstimates");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The estimate could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveServiceEstimateDto? dto) =>
        Save("Add", userId => _repository.SaveAsync(null, dto ?? new SaveServiceEstimateDto(), userId), "The estimate could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveServiceEstimateDto? dto) =>
        Save("Update", userId => _repository.SaveAsync(publicId, dto ?? new SaveServiceEstimateDto(), userId), "The estimate could not be updated.");

    [HttpPut("{publicId:guid}/status")]
    public Task<IActionResult> ChangeStatus(Guid publicId, [FromBody] ServiceEstimateStatusChangeDto? dto) =>
        Save("Update", userId => _repository.ChangeStatusAsync(publicId, dto ?? new ServiceEstimateStatusChangeDto(), userId), "The status could not be changed.");

    [HttpPost("{publicId:guid}/revise")]
    public Task<IActionResult> Revise(Guid publicId) =>
        Save("Update", userId => _repository.ReviseAsync(publicId, userId), "The estimate could not be revised.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteAsync(publicId, userId), "The estimate could not be deleted.");

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            new[] { "Restore" },
            async () =>
            {
                string? no = await _repository.RestoreAsync(userId);

                return no == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted estimate to restore.")
                    : Ok(new { Code = no, message = $"{no} restored." });
            },
            "The estimate could not be restored.",
            Conflict409);
    }
}
