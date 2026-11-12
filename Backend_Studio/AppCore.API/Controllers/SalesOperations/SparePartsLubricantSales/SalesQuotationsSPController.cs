//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Application.SalesOperations.SparePartsLubricantSales;
using AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.SparePartsLubricantSales;


//===============================================================
// Sales Quotations - SP : the shared Sales Quotation endpoints,
// priced by the Sales Invoices - SP engine in quotation mode.
// Hand-written (replaces the Code Sync placeholder) : NEVER run
// Code Sync for this page again.
//===============================================================

[ApiController]
[Route("api/sales-operations/spare-parts-lubricant-sales/sales-quotations-sp")]
public class SalesQuotationsSpController
    : SalesQuotationControllerBase
{
    public SalesQuotationsSpController(
        ISalesInvoicesSpRepository pricing,
        ISalesQuotationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesQuotationsSpController> logger)
        : base(
            pricing,
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "SP";

    protected override string PageRoute =>
        "/sales-operations/%/sales-quotations-sp";
}
