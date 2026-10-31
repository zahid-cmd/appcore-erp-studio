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
// Spare Parts & Lubricants Ledger : the shared Product Ledgers endpoints
//===============================================================

[ApiController]

[Route("api/inventory-management/product-ledgers/spare-parts-lubricants-ledger")]

public class SparePartsLubricantsLedgerController
    : ProductLedgersControllerBase
{
    public SparePartsLubricantsLedgerController(
        IProductLedgersRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SparePartsLubricantsLedgerController> logger)
        : base(
            repository,
            effectiveAccess,
            logger)
    {
    }


    protected override string PageType =>
        "SP";


    protected override string PageRoute =>
        "/inventory-management/%/spare-parts-lubricants-ledger";
}
