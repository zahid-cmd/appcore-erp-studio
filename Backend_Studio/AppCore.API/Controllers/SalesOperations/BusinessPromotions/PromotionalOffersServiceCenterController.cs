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
// Promotional Offers - Service Center : the shared Promotional Offer
// endpoints for channel ServiceCenter. Hand-written : NEVER run Code Sync
// for this page.
//===============================================================

[ApiController]
[Route("api/sales-operations/business-promotions/promotional-offers-service-center")]
public class PromotionalOffersServiceCenterController
    : PromotionalOfferControllerBase
{
    public PromotionalOffersServiceCenterController(
        IPromotionalOffersRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PromotionalOffersServiceCenterController> logger)
        : base(
            repository,
            activityHistoryRepository,
            effectiveAccess,
            logger)
    {
    }


    protected override string Channel =>
        "ServiceCenter";

    protected override string PageTitle =>
        "Promotional Offers - Service Center";

    protected override string PageRoute =>
        "/sales-operations/%/promotional-offers-service-center";
}
