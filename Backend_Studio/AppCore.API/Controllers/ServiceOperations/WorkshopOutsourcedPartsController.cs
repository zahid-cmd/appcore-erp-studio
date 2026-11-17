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
// Service Operations : Parts Outsourcing on a job card (hand-written
// : NEVER run Code Sync; table made by ServiceOperations_Outsourced_
// Parts.sql). It is part of the Job Cards page : its permissions are
// the ones of Job Cards.
//
//   api/service-operations/workshop-management/job-cards
//       GET  {publicId}/outsourced-parts              the entries, the suppliers
//       POST {publicId}/outsourced-parts              saved and posted at once
//       PUT  {publicId}/outsourced-parts/{id}/cancel  the journal is reversed
//
// Page action Sell Above MRP : billing a part above its price.
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/job-cards")]
public class JobCardOutsourcedPartsController
    : WsControllerBase
{
    private const string AboveMrpActivity = "Sell Above MRP";

    private readonly IWorkshopOutsourcedPartsRepository _repository;

    private readonly IEffectiveAccessRepository _access;

    public JobCardOutsourcedPartsController(IWorkshopOutsourcedPartsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<JobCardOutsourcedPartsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
        _access = effectiveAccess;
    }

    protected override string PageRoute => "/service-operations/%/job-cards";

    protected override string PageName => "Job Cards";

    private Task<bool> CanAboveMrpAsync() => _access.HasActivityAsync(UserId, PageRoute, AboveMrpActivity);

    [HttpGet("{publicId:guid}/outsourced-parts")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId, await CanAboveMrpAsync())), "The outsourced parts could not be loaded.");

    [HttpPost("{publicId:guid}/outsourced-parts")]
    public async Task<IActionResult> Add(Guid publicId, [FromBody] SaveOutsourcedPartDto? dto)
    {
        bool above = await CanAboveMrpAsync();

        return await Save("Update", userId => _repository.AddAsync(publicId, dto ?? new SaveOutsourcedPartDto(), above, userId), "The outsourced part could not be saved.");
    }

    [HttpPut("{publicId:guid}/outsourced-parts/{partPublicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid publicId, Guid partPublicId, [FromBody] CancelOutsourcedPartDto? dto)
    {
        bool above = await CanAboveMrpAsync();

        return await Save("Update", userId => _repository.CancelAsync(publicId, partPublicId, dto ?? new CancelOutsourcedPartDto(), above, userId), "The outsourced part could not be cancelled.");
    }
}
