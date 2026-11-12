//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.SparePartsLubricantSales;
using AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.SparePartsLubricantSales;


//===============================================================
// Sales Returns - SP : the shared Sales Return endpoints, run by the
// Sales Invoices - SP engine (one posted invoice per return).
// Hand-written (replaces the Code Sync placeholder) : NEVER run
// Code Sync for this page again.
//===============================================================

[ApiController]
[Route("api/sales-operations/spare-parts-lubricant-sales/sales-returns-sp")]
public class SalesReturnsSpController
    : SalesReturnControllerBase
{
    public SalesReturnsSpController(
        ISalesInvoicesSpRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesReturnsSpController> logger)
        : base(
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "SP";

    protected override string PageRoute =>
        "/sales-operations/%/sales-returns-sp";
}
