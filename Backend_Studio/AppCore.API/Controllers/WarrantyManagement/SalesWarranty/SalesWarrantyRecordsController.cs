//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Api.Controllers.ServiceOperations;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.WarrantyManagement.SalesWarranty;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.WarrantyManagement.SalesWarranty;


//===============================================================
// Warranty Management > Sales Warranty > Sales Warranty Records
// (read-only, hand-written page : NEVER run Code Sync for it)
//
//   api/warranty-management/sales-warranty/sales-warranty-records
//       GET ''   {publicId}
//
// Errors : { message } with 404 / 500
//===============================================================

[ApiController]
[Route("api/warranty-management/sales-warranty/sales-warranty-records")]
public class SalesWarrantyRecordsController
    : WsControllerBase
{
    private readonly ISalesWarrantyRecordsRepository _repository;

    public SalesWarrantyRecordsController(ISalesWarrantyRecordsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<SalesWarrantyRecordsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/warranty-management/%/sales-warranty-records";

    protected override string PageName => "Sales Warranty Records";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAllAsync()), "Warranty records could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The warranty record could not be loaded.");
}
