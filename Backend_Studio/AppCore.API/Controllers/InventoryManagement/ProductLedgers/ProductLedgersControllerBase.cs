//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.ProductLedgers;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.ProductLedgers;


//===============================================================
// Product Ledgers : the read-only endpoints of one page (Motor
// Bikes Ledger / Spare Parts & Lubricants Ledger / Accessories
// Ledger). Each page's controller gives its route, page type
// and page route.
//
//   GET filters      branches, warehouses, categories, sub
//                    categories, products + CanViewCost
//   GET statement    one product : opening, rows, closing
//       ?productId=&from=&to=&branchId=&warehouseId=
//        &showCancelled=&withBikes=
//   GET summary      one row per product
//       ?kind=&categoryId=&subCategoryId=&from=&to=
//        &branchId=&warehouseId=&showCancelled=
//
// Values are sent only when the user has "View Cost" on the
// page (Role + Special Assignment); otherwise they are 0 and
// CanViewCost is false.
//===============================================================

public abstract class ProductLedgersControllerBase : ControllerBase
{
    private readonly IProductLedgersRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;

    private const string ViewCost = "View Cost";


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    protected ProductLedgersControllerBase(
        IProductLedgersRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
    {
        _repository = repository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }


    //===========================================================
    // This page
    //===========================================================

    // MB / SP / AC
    protected abstract string PageType { get; }

    // "/inventory-management/%/motor-bikes-ledger"
    protected abstract string PageRoute { get; }


    private Task<bool> CanViewCostAsync() =>
        _effectiveAccess.HasActivityAsync(
            UserId,
            PageRoute,
            ViewCost);


    //===========================================================
    // Run with the standard error answers
    //===========================================================

    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> action,
        string failure
    )
    {
        try
        {
            return await action();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Failure}", failure);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                failure);
        }
    }


    //===========================================================
    // Filter lists
    //===========================================================

    [HttpGet("filters")]
    public Task<IActionResult> GetFilters()
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetFiltersAsync(
                        PageType,
                        await CanViewCostAsync())),
            "Failed to load the products.");
    }


    //===========================================================
    // Statement of one product
    //===========================================================

    [HttpGet("statement")]
    public Task<IActionResult> GetStatement(
        [FromQuery] long productId,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] long warehouseId,
        [FromQuery] bool showCancelled,
        [FromQuery] bool withBikes)
    {
        return Run(
            async () =>
            {
                ProductLedgerStatementDto? statement =
                    await _repository.GetStatementAsync(
                        PageType,
                        productId,
                        from,
                        to,
                        branchId,
                        warehouseId,
                        showCancelled,
                        withBikes,
                        await CanViewCostAsync());

                return statement == null
                    ? NotFound("Product not found.")
                    : Ok(statement);
            },
            "Failed to load the product ledger.");
    }


    //===========================================================
    // Summary : one row per product
    //===========================================================

    [HttpGet("summary")]
    public Task<IActionResult> GetSummary(
        [FromQuery] string? kind,
        [FromQuery] long categoryId,
        [FromQuery] long subCategoryId,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] long branchId,
        [FromQuery] long warehouseId,
        [FromQuery] bool showCancelled)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetSummaryAsync(
                        PageType,
                        kind,
                        categoryId,
                        subCategoryId,
                        from,
                        to,
                        branchId,
                        warehouseId,
                        showCancelled,
                        await CanViewCostAsync())),
            "Failed to load the summary.");
    }
}
