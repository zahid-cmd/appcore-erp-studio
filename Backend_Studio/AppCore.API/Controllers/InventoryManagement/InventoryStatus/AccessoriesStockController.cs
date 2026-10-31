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
// Accessories Stock : the shared Inventory Status endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/inventory-status/accessories-stock")]

public class AccessoriesStockController
    : InventoryStatusControllerBase
{
    public AccessoriesStockController(
        IInventoryStatusRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<AccessoriesStockController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "AC";


    protected override string PageRoute =>
        "/inventory-management/%/accessories-stock";
}
