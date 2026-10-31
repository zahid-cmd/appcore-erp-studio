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
// Spare Parts & Lubricants Receiving : the shared Product Receiving endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/product-receiving/spare-parts-lubricants-receiving")]

public class SparePartsLubricantsReceivingController
    : ReceivingControllerBase
{
    public SparePartsLubricantsReceivingController(
        ISparePartsLubricantsReceivingRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SparePartsLubricantsReceivingController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "SP";


    protected override string PageRoute =>
        "/inventory-management/%/spare-parts-lubricants-receiving";
}
