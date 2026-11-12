//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.AccessoriesSales;
using AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.AccessoriesSales;


//===============================================================
// Sales Returns - AC : the shared Sales Return endpoints, run by the
// Sales Invoices - AC engine (one posted invoice per return).
// Hand-written (replaces the Code Sync placeholder) : NEVER run
// Code Sync for this page again.
//===============================================================

[ApiController]
[Route("api/sales-operations/accessories-sales/sales-returns-ac")]
public class SalesReturnsAcController
    : SalesReturnControllerBase
{
    public SalesReturnsAcController(
        ISalesInvoicesAcRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesReturnsAcController> logger)
        : base(
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "AC";

    protected override string PageRoute =>
        "/sales-operations/%/sales-returns-ac";
}
