//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Procurement.MotorBikePurchase;
using AppCore.Api.Controllers.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Orders - MB Controller (Motor Bike Purchase)
//
// The endpoints are in PurchaseOrderControllerBase (shared by MB /
// SP / AC); this page gives its route, type and repository.
//===============================================================

[ApiController]

[Route("api/procurement/motor-bike-purchase/purchase-orders-mb")]

public class PurchaseOrdersMbController
    : PurchaseOrderControllerBase
{
    public PurchaseOrdersMbController(
        IPurchaseOrdersMbRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PurchaseOrdersMbController> logger)
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
        "/procurement/%/purchase-orders-mb";
}