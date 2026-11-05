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
// Sales Invoices - SP : the shared Sales Invoices endpoints
//===============================================================

[ApiController]

[Route("api/sales-operations/spare-parts-lubricant-sales/sales-invoices-sp")]

public class SalesInvoicesSpController
    : SalesInvoiceControllerBase
{
    public SalesInvoicesSpController(
        ISalesInvoicesSpRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalesInvoicesSpController> logger)
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
        "/sales-operations/%/sales-invoices-sp";
}
