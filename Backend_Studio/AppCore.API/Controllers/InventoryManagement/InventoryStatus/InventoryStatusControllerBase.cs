//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.InventoryStatus;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.InventoryStatus;


//===============================================================
// Inventory Status : the read-only stock endpoints of one page
// (Motor Bike Stock / Spare Parts & Lubricants Stock /
// Accessories Stock). Each page's controller gives its route,
// page type and page route.
//
//   GET                       the stock list + filter options
//       ?branchId=1&warehouseId=0          (0 = all)
//   GET {productId}/card      one product : batches, ledger,
//       ?branchId=&warehouseId=            places, bikes (MB)
//   GET bikes                 MB : bikes of posted purchases
//       ?branchId=&search=
//
// Cost and value are sent only when the user has "View Cost" on
// the page (Role + Special Assignment); otherwise they are 0 and
// CanViewCost is false.
//===============================================================

public abstract class InventoryStatusControllerBase : ControllerBase
{
    private readonly IInventoryStatusRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;

    private const string ViewCost = "View Cost";


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    protected InventoryStatusControllerBase(
        IInventoryStatusRepository repository,
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

    // "/inventory-management/%/motor-bike-stock"
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
    // Stock list
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetStock(
        [FromQuery] long branchId,
        [FromQuery] long warehouseId)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetStockAsync(
                        PageType,
                        branchId,
                        warehouseId,
                        await CanViewCostAsync())),
            "Failed to load the stock.");
    }


    //===========================================================
    // Stock card of one product
    //===========================================================

    [HttpGet("{productId:long}/card")]
    public Task<IActionResult> GetCard(
        long productId,
        [FromQuery] long branchId,
        [FromQuery] long warehouseId)
    {
        return Run(
            async () =>
            {
                InventoryStockCardDto? card =
                    await _repository.GetCardAsync(
                        PageType,
                        productId,
                        branchId,
                        warehouseId,
                        await CanViewCostAsync());

                return card == null
                    ? NotFound("Product not found.")
                    : Ok(card);
            },
            "Failed to load the stock card.");
    }


    //===========================================================
    // Motor bikes (MB page only)
    //===========================================================

    [HttpGet("bikes")]
    public Task<IActionResult> GetBikes(
        [FromQuery] long branchId,
        [FromQuery] string? search)
    {
        if (PageType != "MB")
        {
            return Task.FromResult<IActionResult>(
                NotFound("Bikes are listed on the Motor Bike Stock page."));
        }

        return Run(
            async () =>
                Ok(
                    await _repository.GetBikesAsync(
                        branchId,
                        search,
                        await CanViewCostAsync())),
            "Failed to load the bikes.");
    }
}
