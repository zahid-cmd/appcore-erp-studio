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
// Barcode Management (utility page : labels of the stock batches,
// hang-tags of the motor bikes)
//
//   GET  settings?type=MB|SP|AC          switches + brand / category
//                                        / product pickers
//   GET  documents?type=&source=         posted price changes
//                                        (pricechange) / purchases
//                                        (purchase) with stock
//   POST rows                            the batches of a source
//                                        (filter body), one row each
//   GET  units?purchaseId=               motor bikes on hand of a
//                                        purchase (hang-tags)
//   POST units                           motor bikes behind the
//                                        batches of any source
//   POST history                         one print run (needs
//                                        "Print"; stored only while
//                                        the history switch is ON)
//
// 400 : input or rule broken ; 403 : no permission ; 404 : not found
//===============================================================

[ApiController]

[Route("api/inventory-management/pricing-labels/barcode-management")]

public class BarcodeManagementController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/barcode-management";

    private readonly IBarcodeManagementRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<BarcodeManagementController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();

    public BarcodeManagementController(
        IBarcodeManagementRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<BarcodeManagementController> logger)
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
                $"You do not have the \"{activity}\" permission on Barcode Management.");
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
    // Read (plain reads : no activity, like the Price List)
    //===========================================================

    [HttpGet("settings")]
    public Task<IActionResult> GetSettings(
        [FromQuery] string? type)
    {
        return Run(
            async () => Ok(await _repository.GetSettingsAsync(type ?? string.Empty)),
            "Failed to load the barcode settings.");
    }

    [HttpGet("documents")]
    public Task<IActionResult> GetDocuments(
        [FromQuery] string? type,
        [FromQuery] string? source)
    {
        return Run(
            async () => Ok(await _repository.GetDocumentsAsync(type ?? string.Empty, source ?? string.Empty)),
            "Failed to load the documents.");
    }

    [HttpPost("rows")]
    public Task<IActionResult> GetRows(
        [FromBody] BarcodeRowsFilterDto? filter)
    {
        return Run(
            async () => Ok(await _repository.GetRowsAsync(filter ?? new BarcodeRowsFilterDto())),
            "Failed to load the batches.");
    }

    [HttpGet("units")]
    public Task<IActionResult> GetUnitsByPurchase(
        [FromQuery] long purchaseId)
    {
        return Run(
            async () => Ok(await _repository.GetUnitsByPurchaseAsync(purchaseId)),
            "Failed to load the motor bikes of the purchase.");
    }

    [HttpPost("units")]
    public Task<IActionResult> GetUnits(
        [FromBody] BarcodeRowsFilterDto? filter)
    {
        return Run(
            async () => Ok(await _repository.GetUnitsAsync(filter ?? new BarcodeRowsFilterDto())),
            "Failed to load the motor bikes.");
    }


    //===========================================================
    // Print history (needs "Print" : the page asks before it
    // prints, so a refusal stops the print)
    //===========================================================

    [HttpPost("history")]
    public Task<IActionResult> SaveHistory(
        [FromBody] BarcodeHistoryInputDto? input)
    {
        long branchId =
            this.CurrentBranchId() ?? 0;

        string userName =
            this.CurrentUserName();

        return Guarded(
            "Print",
            async () => Ok(await _repository.SaveHistoryAsync(input ?? new BarcodeHistoryInputDto(), UserId, userName, branchId)),
            "Failed to save the print history.");
    }
}
