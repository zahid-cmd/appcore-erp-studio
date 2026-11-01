//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.ProductLedgers;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.ProductLedgers;


//===============================================================
// Motor Bikes Ledger : the shared Product Ledgers endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/product-ledgers/motor-bikes-ledger")]

public class MotorBikesLedgerController
    : ProductLedgersControllerBase
{
    public MotorBikesLedgerController(
        IProductLedgersRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<MotorBikesLedgerController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "MB";


    protected override string PageRoute =>
        "/inventory-management/%/motor-bikes-ledger";
}
