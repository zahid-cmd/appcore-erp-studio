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
// Purchases - MB : the shared Purchases endpoints
//===============================================================

[ApiController]

[Route("api/procurement/motor-bike-purchase/purchases-mb")]

public class PurchasesMbController
    : PurchaseControllerBase
{
    public PurchasesMbController(
        IPurchasesMbRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PurchasesMbController> logger)
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
        "/procurement/%/purchases-mb";
}
