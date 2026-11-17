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
// Service Operations, service billing (hand-written pages : NEVER
// run Code Sync for them; tables made by ServiceOperations_Billing_
// Engine.sql)
//
//   api/service-operations/service-billing/service-invoices
//       GET ''   lookups   history   {publicId}
//       POST price          the figures of a job card, nothing saved
//       POST ''             posted at once (journal + receipt)
//       PUT {publicId}/deliver
//   api/service-operations/service-billing/service-returns
//       GET ''   invoices   history   {publicId}
//       POST ''             the whole invoice reversed
//   api/service-operations/service-billing/free-service-claims
//       GET ''   lookups   lines/{brandId}   history   {publicId}
//       POST ''   PUT {publicId}/settle   PUT {publicId}/cancel
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/service-billing/service-invoices")]
public class ServiceInvoicesController
    : WsControllerBase
{
    private const string CreditActivity = "Credit Sale";

    private readonly IServiceInvoicesRepository _repository;

    private readonly IEffectiveAccessRepository _access;

    public ServiceInvoicesController(IServiceInvoicesRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<ServiceInvoicesController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
        _access = effectiveAccess;
    }

    protected override string PageRoute => "/service-operations/%/service-invoices";

    protected override string PageName => "Service Invoices";

    // A due needs the page action Credit Sale
    private Task<bool> CanCreditAsync() => _access.HasActivityAsync(UserId, PageRoute, CreditActivity);

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAllAsync()), "Service invoices could not be loaded.");

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(async () => Ok(await _repository.GetLookupsAsync(await CanCreditAsync())), "The invoice lists could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("ServiceInvoices");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The service invoice could not be loaded.");

    [HttpPost("price")]
    public Task<IActionResult> Price([FromBody] SaveServiceInvoiceDto? dto) =>
        Run(async () => Ok(await _repository.PriceAsync(dto ?? new SaveServiceInvoiceDto(), await CanCreditAsync())), "The job card could not be priced.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveServiceInvoiceDto? dto) =>
        Save("Add", async userId => await _repository.PostAsync(dto ?? new SaveServiceInvoiceDto(), await CanCreditAsync(), userId), "The service invoice could not be posted.");

    [HttpPut("{publicId:guid}/deliver")]
    public Task<IActionResult> Deliver(Guid publicId) =>
        Save("Update", userId => _repository.DeliverAsync(publicId, userId), "The delivery could not be saved.");
}


[ApiController]
[Route("api/service-operations/service-billing/service-returns")]
public class ServiceReturnsController
    : WsControllerBase
{
    private readonly IServiceInvoicesRepository _repository;

    public ServiceReturnsController(IServiceInvoicesRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<ServiceReturnsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/service-returns";

    protected override string PageName => "Service Returns";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetReturnsAsync()), "Service returns could not be loaded.");

    // Posted invoices to pick
    [HttpGet("invoices")]
    public Task<IActionResult> GetInvoices() =>
        Run(async () => Ok(await _repository.GetReturnableAsync()), "The invoices could not be loaded.");

    // The invoice that is being returned
    [HttpGet("invoice/{publicId:guid}")]
    public Task<IActionResult> GetInvoice(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The service invoice could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("ServiceReturns");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetReturnAsync(publicId)), "The service return could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] PostServiceReturnDto? dto) =>
        Save("Add", userId => _repository.PostReturnAsync(dto ?? new PostServiceReturnDto(), userId), "The service return could not be posted.");
}


[ApiController]
[Route("api/service-operations/service-billing/free-service-claims")]
public class FreeServiceClaimsController
    : WsControllerBase
{
    private readonly IFreeServiceClaimsRepository _repository;

    public FreeServiceClaimsController(IFreeServiceClaimsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<FreeServiceClaimsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/free-service-claims";

    protected override string PageName => "Free Service Claims";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAllAsync()), "Claims could not be loaded.");

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(async () => Ok(await _repository.GetLookupsAsync()), "The claim lists could not be loaded.");

    [HttpGet("lines/{brandId:long}")]
    public Task<IActionResult> GetLines(long brandId) =>
        Run(async () => Ok(await _repository.GetOpenLinesAsync(brandId)), "The free services could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("FreeServiceClaims");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The claim could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveFreeServiceClaimDto? dto) =>
        Save("Add", userId => _repository.CreateAsync(dto ?? new SaveFreeServiceClaimDto(), userId), "The claim could not be saved.");

    [HttpPut("{publicId:guid}/settle")]
    public Task<IActionResult> Settle(Guid publicId, [FromBody] SettleFreeServiceClaimDto? dto) =>
        Save("Update", userId => _repository.SettleAsync(publicId, dto ?? new SettleFreeServiceClaimDto(), userId), "The claim could not be settled.");

    [HttpPut("{publicId:guid}/cancel")]
    public Task<IActionResult> Cancel(Guid publicId) =>
        Save("Update", userId => _repository.CancelAsync(publicId, userId), "The claim could not be cancelled.");
}
