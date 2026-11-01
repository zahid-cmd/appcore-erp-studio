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
// Purchases - AC : the shared Purchases endpoints
//===============================================================

[ApiController]

[Route("api/procurement/accessories-purchase/purchases-ac")]

public class PurchasesAcController
    : PurchaseControllerBase
{
    public PurchasesAcController(
        IPurchasesAcRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PurchasesAcController> logger)
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
        "/procurement/%/purchases-ac";
}
