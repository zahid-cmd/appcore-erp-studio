//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Application.SalesOperations.AccessoriesSales;
using AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.AccessoriesSales;


//===============================================================
// Sales Quotations - AC : the shared Sales Quotation endpoints,
// priced by the Sales Invoices - AC engine in quotation mode.
// Hand-written (replaces the Code Sync placeholder) : NEVER run
// Code Sync for this page again.
//===============================================================

[ApiController]
[Route("api/sales-operations/accessories-sales/sales-quotations-ac")]
public class SalesQuotationsAcController
    : SalesQuotationControllerBase
{
    public SalesQuotationsAcController(
        ISalesInvoicesAcRepository pricing,
        ISalesQuotationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesQuotationsAcController> logger)
        : base(
            pricing,
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "AC";

    protected override string PageRoute =>
        "/sales-operations/%/sales-quotations-ac";
}
