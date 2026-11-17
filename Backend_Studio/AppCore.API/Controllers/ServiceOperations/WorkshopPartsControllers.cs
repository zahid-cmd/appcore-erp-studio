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
// Service Operations, the parts of a job card (hand-written pages :
// NEVER run Code Sync for them; tables made by ServiceOperations_
// Parts_Engine.sql)
//
//   api/service-operations/workshop-management/parts-requisitions
//       GET ''   lookups   draft/{jobCardPublicId}   history
//       GET {publicId}     POST ''    PUT {publicId}
//       PUT {publicId}/status         Cancelled / Closed
//   api/service-operations/workshop-management/parts-issues
//       GET ''   lookups   stock/{warehouseId}   history
//       GET {publicId}     POST ''    (posted at once)
//   api/service-operations/workshop-management/parts-returns
//       GET ''   lookups   history   issue/{issuePublicId}
//       GET {publicId}     POST ''    (posted at once)
//   api/service-operations/workshop-management/parts-back-orders
//       GET ''
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/parts-requisitions")]
public class PartsRequisitionsController
    : WsControllerBase
{
    private readonly IWorkshopPartsRepository _repository;

    private readonly IServiceEstimatesRepository _catalogue;

    public PartsRequisitionsController(IWorkshopPartsRepository repository, IServiceEstimatesRepository catalogue, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<PartsRequisitionsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
        _catalogue = catalogue;
    }

    // Spare parts, lubricants and accessories to pick : the ones of
    // the business lines the service center runs
    [HttpGet("parts")]
    public Task<IActionResult> GetParts([FromQuery] long? branchId) =>
        Run(async () => Ok(await _catalogue.GetPartsAsync(branchId)), "The parts could not be loaded.");

    protected override string PageRoute => "/service-operations/%/parts-requisitions";

    protected override string PageName => "Parts Requisitions";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetRequisitionsAsync()), "Requisitions could not be loaded.");

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(async () => Ok(await _repository.GetLookupsAsync()), "The requisition lists could not be loaded.");

    [HttpGet("draft/{jobCardPublicId:guid}")]
    public Task<IActionResult> GetDraft(Guid jobCardPublicId) =>
        Run(async () => Ok(await _repository.GetRequisitionDraftAsync(jobCardPublicId)), "The job card could not be read.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("PartsRequisitions");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetRequisitionAsync(publicId)), "The requisition could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SavePartsRequisitionDto? dto) =>
        Save("Add", userId => _repository.SaveRequisitionAsync(null, dto ?? new SavePartsRequisitionDto(), userId), "The requisition could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SavePartsRequisitionDto? dto) =>
        Save("Update", userId => _repository.SaveRequisitionAsync(publicId, dto ?? new SavePartsRequisitionDto(), userId), "The requisition could not be updated.");

    [HttpPut("{publicId:guid}/status")]
    public Task<IActionResult> ChangeStatus(Guid publicId, [FromBody] PartsStatusChangeDto? dto) =>
        Save("Update", userId => _repository.ChangeRequisitionStatusAsync(publicId, dto ?? new PartsStatusChangeDto(), userId), "The status could not be changed.");
}


[ApiController]
[Route("api/service-operations/workshop-management/parts-issues")]
public class PartsIssuesController
    : WsControllerBase
{
    private readonly IWorkshopPartsRepository _repository;

    private readonly IServiceEstimatesRepository _catalogue;

    public PartsIssuesController(IWorkshopPartsRepository repository, IServiceEstimatesRepository catalogue, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<PartsIssuesController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
        _catalogue = catalogue;
    }

    // Spare parts, lubricants and accessories to pick : the ones of
    // the business lines the service center runs
    [HttpGet("parts")]
    public Task<IActionResult> GetParts([FromQuery] long? branchId) =>
        Run(async () => Ok(await _catalogue.GetPartsAsync(branchId)), "The parts could not be loaded.");

    protected override string PageRoute => "/service-operations/%/parts-issues";

    protected override string PageName => "Parts Issues";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetIssuesAsync()), "Parts issues could not be loaded.");

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(async () => Ok(await _repository.GetLookupsAsync()), "The issue lists could not be loaded.");

    [HttpGet("stock/{warehouseId:long}")]
    public Task<IActionResult> GetStock(long warehouseId) =>
        Run(async () => Ok(await _repository.GetStockAsync(warehouseId)), "The stock could not be read.");

    // The lines a requisition still waits for
    [HttpGet("requisition/{publicId:guid}")]
    public Task<IActionResult> GetRequisition(Guid publicId) =>
        Run(async () => Ok(await _repository.GetRequisitionAsync(publicId)), "The requisition could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("PartsIssues");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetIssueAsync(publicId)), "The parts issue could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] PostPartsIssueDto? dto) =>
        Save("Add", userId => _repository.PostIssueAsync(dto ?? new PostPartsIssueDto(), userId), "The parts could not be issued.");
}


[ApiController]
[Route("api/service-operations/workshop-management/parts-returns")]
public class PartsReturnsController
    : WsControllerBase
{
    private readonly IWorkshopPartsRepository _repository;

    public PartsReturnsController(IWorkshopPartsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<PartsReturnsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/parts-returns";

    protected override string PageName => "Parts Returns";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetReturnsAsync()), "Parts returns could not be loaded.");

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(async () => Ok(await _repository.GetLookupsAsync()), "The return lists could not be loaded.");

    // The issue the parts come back of, with its lines
    [HttpGet("issue/{publicId:guid}")]
    public Task<IActionResult> GetIssue(Guid publicId) =>
        Run(async () => Ok(await _repository.GetIssueAsync(publicId)), "The parts issue could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("PartsReturns");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetReturnAsync(publicId)), "The parts return could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] PostPartsReturnDto? dto) =>
        Save("Add", userId => _repository.PostReturnAsync(dto ?? new PostPartsReturnDto(), userId), "The parts could not be returned.");
}


[ApiController]
[Route("api/service-operations/workshop-management/parts-back-orders")]
public class PartsBackOrdersController
    : WsControllerBase
{
    private readonly IWorkshopPartsRepository _repository;

    public PartsBackOrdersController(IWorkshopPartsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<PartsBackOrdersController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/parts-back-orders";

    protected override string PageName => "Parts Back-Orders";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetBackOrdersAsync()), "The back-orders could not be loaded.");
}
