//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.ProductReceiving;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.ProductReceiving;


//===============================================================
// Motor Bike Receiving : the shared Product Receiving endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/product-receiving/motor-bike-receiving")]

public class MotorBikeReceivingController
    : ReceivingControllerBase
{
    public MotorBikeReceivingController(
        IMotorBikeReceivingRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<MotorBikeReceivingController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "MB";


    protected override string PageRoute =>
        "/inventory-management/%/motor-bike-receiving";
}
