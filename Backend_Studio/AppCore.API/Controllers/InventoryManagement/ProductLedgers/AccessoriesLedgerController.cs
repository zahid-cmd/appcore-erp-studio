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
// Accessories Ledger : the shared Product Ledgers endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/product-ledgers/accessories-ledger")]

public class AccessoriesLedgerController
    : ProductLedgersControllerBase
{
    public AccessoriesLedgerController(
        IProductLedgersRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<AccessoriesLedgerController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "AC";


    protected override string PageRoute =>
        "/inventory-management/%/accessories-ledger";
}
