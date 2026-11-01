//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Procurement.SparePartsLubricantPurchase;
using AppCore.Api.Controllers.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Procurement.SparePartsLubricantPurchase;


//===============================================================
// Purchase Orders - SP Controller (Spare Parts & Lubricant Purchase)
//
// The endpoints are in PurchaseOrderControllerBase (shared by MB /
// SP / AC); this page gives its route, type and repository.
//===============================================================

[ApiController]

[Route("api/procurement/spare-parts-lubricant-purchase/purchase-orders-sp")]

public class PurchaseOrdersSpController
    : PurchaseOrderControllerBase
{
    public PurchaseOrdersSpController(
        IPurchaseOrdersSpRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PurchaseOrdersSpController> logger)
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
        "/procurement/%/purchase-orders-sp";
}