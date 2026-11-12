//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.MotorBikeSales;
using AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.MotorBikeSales;


//===============================================================
// Sales Returns - MB : the shared Sales Return endpoints, run by the
// Sales Invoices - MB engine (one posted invoice per return).
// Hand-written (replaces the Code Sync placeholder) : NEVER run
// Code Sync for this page again.
//===============================================================

[ApiController]
[Route("api/sales-operations/motor-bike-sales/sales-returns-mb")]
public class SalesReturnsMbController
    : SalesReturnControllerBase
{
    public SalesReturnsMbController(
        ISalesInvoicesMbRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesReturnsMbController> logger)
        : base(
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "MB";

    protected override string PageRoute =>
        "/sales-operations/%/sales-returns-mb";
}
