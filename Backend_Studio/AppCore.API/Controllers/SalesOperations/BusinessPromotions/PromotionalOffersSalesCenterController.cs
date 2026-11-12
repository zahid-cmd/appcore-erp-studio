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
// Promotional Offers - Sales Center : the shared Promotional Offer
// endpoints for channel SalesCenter. Hand-written : NEVER run Code Sync
// for this page.
//===============================================================

[ApiController]
[Route("api/sales-operations/business-promotions/promotional-offers-sales-center")]
public class PromotionalOffersSalesCenterController
    : PromotionalOfferControllerBase
{
    public PromotionalOffersSalesCenterController(
        IPromotionalOffersRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PromotionalOffersSalesCenterController> logger)
        : base(
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string Channel =>
        "SalesCenter";

    protected override string PageTitle =>
        "Promotional Offers - Sales Center";

    protected override string PageRoute =>
        "/sales-operations/%/promotional-offers-sales-center";
}
