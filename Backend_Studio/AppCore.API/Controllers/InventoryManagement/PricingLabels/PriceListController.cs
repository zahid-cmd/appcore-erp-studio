//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.PricingLabels;

using AppCore.Application.Platform.EffectiveAccess.Interfaces;

using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.PricingLabels;


//===============================================================
// Price List (read only)
//
//   GET ?type=MB|SP|AC            the current MRP of every product
//                                 of the type, in stock or not,
//                                 with cost and stock
//   GET ?type=&print=true         the same for the Print Viewer
//                                 (needs "Print")
//
// 400 : input or rule broken ; 403 : no permission
//===============================================================

[ApiController]

[Route("api/inventory-management/pricing-labels/price-list")]

public class PriceListController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/price-list";

    private readonly IProductPricingRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<PriceListController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();

    public PriceListController(
        IProductPricingRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PriceListController> logger)
    {
        _repository = repository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }


    //===========================================================
    // Permission : null when allowed, else the 403 answer
    //===========================================================

    private async Task<IActionResult?> DenyAsync
    (
        string activity
    )
    {
        bool allowed =
            await _effectiveAccess.HasActivityAsync(
                UserId,
                PageRoute,
                activity);

        return allowed
            ? null
            : StatusCode(
                StatusCodes.Status403Forbidden,
                $"You do not have the \"{activity}\" permission on Price List.");
    }


    //===========================================================
    // Run an action with the standard error answers
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

    private async Task<IActionResult> Guarded
    (
        string activity,
        Func<Task<IActionResult>> action,
        string failure
    )
    {
        IActionResult? denied =
            await DenyAsync(activity);

        return denied ?? await Run(action, failure);
    }


    //===========================================================
    // Read (plain read : no activity, like the Product Ledgers;
    // the print copy needs "Print")
    //===========================================================

    [HttpGet]
    public Task<IActionResult> Get(
        [FromQuery] string? type,
        [FromQuery] bool print = false)
    {
        Func<Task<IActionResult>> action =
            async () => Ok(await _repository.GetPriceListAsync(type ?? string.Empty));

        const string failure =
            "Failed to load the price list.";

        return print
            ? Guarded("Print", action, failure)
            : Run(action, failure);
    }
}
