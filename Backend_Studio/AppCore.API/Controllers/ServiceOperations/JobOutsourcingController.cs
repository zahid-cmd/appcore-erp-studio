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
// Service Operations : the page Job Outsourcing (owner 2026-11-19;
// hand-written : NEVER run Code Sync). The outside works and the
// parts bought outside are entered here for a job in work, any time
// before it is closed. The entries are the ones of Parts Outsourcing
// (the same table, the same posting) : this page has its own
// permissions (View, Add, Delete).
//
//   api/service-operations/workshop-management/job-outsourcing
//       GET  jobs                     the jobs in work
//       GET  outside-works            the works to pick from
//       GET  parts?branchId=          the parts to pick from
//       GET  {publicId}               the entries of a job
//       POST {publicId}               saved and posted at once
//       PUT  {publicId}/{id}/cancel   the journal is reversed
//
// Page action Sell Above MRP (of this page or of Job Cards) : billing
// a part above its price.
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/job-outsourcing")]
public class JobOutsourcingController
    : WsControllerBase
{
    private const string AboveMrpActivity = "Sell Above MRP";

    private const string JobCardsRoute = "/service-operations/%/job-cards";

    private readonly IWorkshopOutsourcedPartsRepository _repository;

    private readonly IWorkshopOutsideWorksRepository _works;

    private readonly IJobCardsRepository _cards;

    public JobOutsourcingController(
        IWorkshopOutsourcedPartsRepository repository,
        IWorkshopOutsideWorksRepository works,
        IJobCardsRepository cards,
        IActivityHistoryRepository history,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<JobOutsourcingController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
        _works = works;
        _cards = cards;
    }

    protected override string PageRoute => "/service-operations/%/job-outsourcing";

    protected override string PageName => "Job Outsourcing";

    private async Task<bool> CanAboveMrpAsync() =>
        await Can(AboveMrpActivity) || await CanOn(JobCardsRoute, AboveMrpActivity);

    [HttpGet("jobs")]
    public Task<IActionResult> GetJobs() =>
        Run(async () => Ok(await _repository.GetJobsAsync()), "The jobs could not be loaded.");

    [HttpGet("outside-works")]
    public Task<IActionResult> GetWorks() =>
        Run(async () => Ok(await _works.GetActiveAsync()), "The outside works could not be loaded.");

    [HttpGet("parts")]
    public Task<IActionResult> GetParts([FromQuery] long? branchId) =>
        Run(async () => Ok(await _cards.GetPartsAsync(branchId)), "The parts could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId, await CanAboveMrpAsync())), "The entries could not be loaded.");

    [HttpPost("{publicId:guid}")]
    public async Task<IActionResult> Add(Guid publicId, [FromBody] SaveOutsourcedPartDto? dto)
    {
        bool above = await CanAboveMrpAsync();

        return await Save("Add", userId => _repository.AddAsync(publicId, dto ?? new SaveOutsourcedPartDto(), above, userId), "The entry could not be saved.");
    }

    [HttpPut("{publicId:guid}/{partPublicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid publicId, Guid partPublicId, [FromBody] CancelOutsourcedPartDto? dto)
    {
        bool above = await CanAboveMrpAsync();

        return await Save("Delete", userId => _repository.CancelAsync(publicId, partPublicId, dto ?? new CancelOutsourcedPartDto(), above, userId), "The entry could not be cancelled.");
    }
}
