//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.BusinessPromotions;


//===============================================================
// Promotional Offers - Accessory Shop : the shared Promotional Offer
// endpoints for channel AccessoryShop. Hand-written : NEVER run Code Sync
// for this page.
//===============================================================

[ApiController]
[Route("api/sales-operations/business-promotions/promotional-offers-accessory-shop")]
public class PromotionalOffersAccessoryShopController
    : PromotionalOfferControllerBase
{
    public PromotionalOffersAccessoryShopController(
        IPromotionalOffersRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PromotionalOffersAccessoryShopController> logger)
        : base(
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string Channel =>
        "AccessoryShop";

    protected override string PageTitle =>
        "Promotional Offers - Accessory Shop";

    protected override string PageRoute =>
        "/sales-operations/%/promotional-offers-accessory-shop";
}
