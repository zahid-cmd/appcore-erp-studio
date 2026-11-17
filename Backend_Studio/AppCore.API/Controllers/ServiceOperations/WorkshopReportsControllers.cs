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
// Service Operations : Workshop Dashboard and Service Reports
// (read-only, hand-written pages : NEVER run Code Sync for them)
//
//   api/service-operations/workshop-management/workshop-dashboard
//       GET ''  ?branchId=
//   api/service-operations/service-reports/{report}
//       GET ''  ?from=&to=&branchId=&text=
//       report : service-history, job-card-register,
//       technician-performance, parts-consumption, service-due-list
//
// Errors : { message } with 400 / 404 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/workshop-dashboard")]
public class WorkshopDashboardController
    : WsControllerBase
{
    private readonly IWorkshopReportsRepository _repository;

    public WorkshopDashboardController(IWorkshopReportsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<WorkshopDashboardController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/workshop-dashboard";

    protected override string PageName => "Workshop Dashboard";

    [HttpGet]
    public Task<IActionResult> Get([FromQuery] long? branchId) =>
        Run(async () => Ok(await _repository.GetDashboardAsync(branchId is > 0 ? branchId : null)), "The workshop dashboard could not be loaded.");
}


[ApiController]
[Route("api/service-operations/service-reports")]
public class ServiceReportsController
    : WsControllerBase
{
    private readonly IWorkshopReportsRepository _repository;

    public ServiceReportsController(IWorkshopReportsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<ServiceReportsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/service-reports/%";

    protected override string PageName => "Service Reports";

    [HttpGet("{report}")]
    public Task<IActionResult> Get(string report, [FromQuery] string? from, [FromQuery] string? to, [FromQuery] long? branchId, [FromQuery] string? text) =>
        Run(async () => Ok(await _repository.GetReportAsync((report ?? string.Empty).Trim().ToLowerInvariant(), from, to, branchId is > 0 ? branchId : null, text)), "The report could not be loaded.");
}
