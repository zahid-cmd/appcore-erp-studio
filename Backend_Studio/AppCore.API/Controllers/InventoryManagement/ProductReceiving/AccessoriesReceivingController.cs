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
// Accessories Receiving : the shared Product Receiving endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/product-receiving/accessories-receiving")]

public class AccessoriesReceivingController
    : ReceivingControllerBase
{
    public AccessoriesReceivingController(
        IAccessoriesReceivingRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<AccessoriesReceivingController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "AC";


    protected override string PageRoute =>
        "/inventory-management/%/accessories-receiving";
}
