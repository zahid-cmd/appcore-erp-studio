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
// Sales Invoices - MB : the shared Sales Invoices endpoints (plus
// bike-units : the chassis in stock)
//===============================================================

[ApiController]
[Route("api/sales-operations/motor-bike-sales/sales-invoices-mb")]
public class SalesInvoicesMbController
    : SalesInvoiceControllerBase
{
    public SalesInvoicesMbController(
        ISalesInvoicesMbRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesInvoicesMbController> logger)
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
        "/sales-operations/%/sales-invoices-mb";
}
