//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Procurement.AccessoriesPurchase;
using AppCore.Api.Controllers.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Procurement.AccessoriesPurchase;


//===============================================================
// Purchase Orders - AC Controller (Accessories Purchase)
//
// The endpoints are in PurchaseOrderControllerBase (shared by MB /
// SP / AC); this page gives its route, type and repository.
//===============================================================

[ApiController]

[Route("api/procurement/accessories-purchase/purchase-orders-ac")]

public class PurchaseOrdersAcController
    : PurchaseOrderControllerBase
{
    public PurchaseOrdersAcController(
        IPurchaseOrdersAcRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PurchaseOrdersAcController> logger)
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
        "/procurement/%/purchase-orders-ac";
}