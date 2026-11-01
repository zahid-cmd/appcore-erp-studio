//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.InventoryStatus;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.InventoryStatus;


//===============================================================
// Spare Parts & Lubricants Stock : the shared Inventory Status endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/inventory-status/spare-parts-lubricants-stock")]

public class SparePartsLubricantsStockController
    : InventoryStatusControllerBase
{
    public SparePartsLubricantsStockController(
        IInventoryStatusRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SparePartsLubricantsStockController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "SP";


    protected override string PageRoute =>
        "/inventory-management/%/spare-parts-lubricants-stock";
}
