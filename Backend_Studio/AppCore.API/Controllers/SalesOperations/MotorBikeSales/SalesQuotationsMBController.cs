//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Application.SalesOperations.MotorBikeSales;
using AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.MotorBikeSales;


//===============================================================
// Sales Quotations - MB : the shared Sales Quotation endpoints,
// priced by the Sales Invoices - MB engine in quotation mode.
// Hand-written (replaces the Code Sync placeholder) : NEVER run
// Code Sync for this page again.
//===============================================================

[ApiController]
[Route("api/sales-operations/motor-bike-sales/sales-quotations-mb")]
public class SalesQuotationsMbController
    : SalesQuotationControllerBase
{
    public SalesQuotationsMbController(
        ISalesInvoicesMbRepository pricing,
        ISalesQuotationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesQuotationsMbController> logger)
        : base(
            pricing,
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "MB";

    protected override string PageRoute =>
        "/sales-operations/%/sales-quotations-mb";
}
