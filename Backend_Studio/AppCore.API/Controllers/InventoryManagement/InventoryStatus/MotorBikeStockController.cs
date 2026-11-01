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
// Motor Bike Stock : the shared Inventory Status endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/inventory-status/motor-bike-stock")]

public class MotorBikeStockController
    : InventoryStatusControllerBase
{
    public MotorBikeStockController(
        IInventoryStatusRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<MotorBikeStockController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "MB";


    protected override string PageRoute =>
        "/inventory-management/%/motor-bike-stock";
}
