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
// Purchases - SP : the shared Purchases endpoints
//===============================================================

[ApiController]

[Route("api/procurement/spare-parts-lubricant-purchase/purchases-sp")]

public class PurchasesSpController
    : PurchaseControllerBase
{
    public PurchasesSpController(
        IPurchasesSpRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PurchasesSpController> logger)
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
        "/procurement/%/purchases-sp";
}
