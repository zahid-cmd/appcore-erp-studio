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
// Service Operations, the list of outside works (hand-written :
// NEVER run Code Sync; table made by ServiceOperations_Outside_
// Works.sql)
//
//   api/service-operations/service-setup/workshop-configuration/outside-works
//       GET ''        the list and the next code
//       POST ''       PUT / DELETE {publicId}
//   api/service-operations/workshop-management/service-estimates/outside-works
//   api/service-operations/workshop-management/job-cards/outside-works
//       GET           the active ones, to pick from
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/service-setup/workshop-configuration/outside-works")]
public class WorkshopOutsideWorksController
    : WsControllerBase
{
    private readonly IWorkshopOutsideWorksRepository _repository;

    public WorkshopOutsideWorksController(IWorkshopOutsideWorksRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<WorkshopOutsideWorksController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/workshop-configuration";

    protected override string PageName => "Workshop Configuration";

    [HttpGet]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetSetupAsync()), "The outside works could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] WorkshopOutsideWorkDto? dto) =>
        Save("Add", userId => _repository.SaveAsync(null, dto ?? new WorkshopOutsideWorkDto(), userId), "The outside work could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] WorkshopOutsideWorkDto? dto) =>
        Save("Update", userId => _repository.SaveAsync(publicId, dto ?? new WorkshopOutsideWorkDto(), userId), "The outside work could not be updated.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteAsync(publicId, userId), "The outside work could not be deleted.");
}


//===============================================================
// The estimate form : the outside works to pick from
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/service-estimates")]
public class ServiceEstimateOutsideWorksController
    : WsControllerBase
{
    private readonly IWorkshopOutsideWorksRepository _repository;

    public ServiceEstimateOutsideWorksController(IWorkshopOutsideWorksRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<ServiceEstimateOutsideWorksController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/service-estimates";

    protected override string PageName => "Service Estimates";

    [HttpGet("outside-works")]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetActiveAsync()), "The outside works could not be loaded.");
}


//===============================================================
// The job card form : the outside works to pick from
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/job-cards")]
public class JobCardOutsideWorksController
    : WsControllerBase
{
    private readonly IWorkshopOutsideWorksRepository _repository;

    public JobCardOutsideWorksController(IWorkshopOutsideWorksRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<JobCardOutsideWorksController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/job-cards";

    protected override string PageName => "Job Cards";

    [HttpGet("outside-works")]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetActiveAsync()), "The outside works could not be loaded.");
}
