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
// Sales Invoices - AC : the shared Sales Invoices endpoints
//===============================================================

[ApiController]

[Route("api/sales-operations/accessories-sales/sales-invoices-ac")]

public class SalesInvoicesAcController
    : SalesInvoiceControllerBase
{
    public SalesInvoicesAcController(
        ISalesInvoicesAcRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesInvoicesAcController> logger)
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
        "/sales-operations/%/sales-invoices-ac";
}
