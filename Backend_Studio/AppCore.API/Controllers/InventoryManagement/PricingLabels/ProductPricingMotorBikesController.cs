//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement;

using AppCore.Application.InventoryManagement.PricingLabels;

using AppCore.Application.Platform.EffectiveAccess.Interfaces;

using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing - Motor Bikes (price cards, 2026-11-09)
//
//   GET paged                   list (tab, search, sort, page)
//   GET defaults                suppliers, models, VAT rules
//   GET active?supplierCode=&date=  the card in force per model
//   GET {publicId}
//   POST                        save draft             (Add)
//   PUT {publicId}              change draft           (Update)
//   DELETE {publicId}           delete draft           (Delete)
//   PUT {publicId}/post         post                   (Post)
//   PUT {publicId}/cancel       { Reason }             (Cancel)
//   PUT restore                 last deleted draft     (Restore)
//   GET history / GET {publicId}/history
//===============================================================

[ApiController]

[Route("api/inventory-management/pricing-labels/product-pricing-motor-bikes")]

public class ProductPricingMotorBikesController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/product-pricing-motor-bikes";

    private const string PageName =
        "Product Pricing - Motor Bikes";

    private readonly IProductPricingMotorBikesRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<ProductPricingMotorBikesController> _logger;

    private long UserId => this.CurrentUserId();

    public ProductPricingMotorBikesController(
        IProductPricingMotorBikesRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<ProductPricingMotorBikesController> logger)
    {
        _repository = repository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }


    //===========================================================
    // Permission / errors
    //===========================================================

    private async Task<IActionResult?> DenyAsync(
        string activity)
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
                $"You do not have the \"{activity}\" permission on {PageName}.");
    }

    private async Task<IActionResult> Run(
        Func<Task<IActionResult>> action,
        string failure)
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
                $"{failure} {ex.GetBaseException().Message}");
        }
    }

    private async Task<IActionResult> Guarded(
        string activity,
        Func<Task<IActionResult>> action,
        string failure)
    {
        IActionResult? denied =
            await DenyAsync(activity);

        return denied ?? await Run(action, failure);
    }

    private async Task<long?> IdOf(
        Guid publicId) =>
        await _repository.GetIdByPublicIdAsync(publicId);


    //===========================================================
    // Read
    //===========================================================

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] InventoryDocumentPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request ?? new InventoryDocumentPageRequest())),
            "Failed to load the price cards.");
    }

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults()
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync()),
            "Failed to load the price card lists.");
    }

    // Last purchase cost (from the supplier) and stock per colour
    [HttpGet("costs")]
    public Task<IActionResult> GetCosts(
        [FromQuery] string? supplierCode)
    {
        return Run(
            async () => Ok(await _repository.GetCostsAsync(supplierCode ?? string.Empty)),
            "Failed to load the last costs.");
    }

    [HttpGet("active")]
    public Task<IActionResult> GetActive(
        [FromQuery] string? supplierCode,
        [FromQuery] string? date,
        [FromQuery] bool regularOnly = false)
    {
        return Run(
            async () =>
            {
                DateOnly day =
                    DateOnly.TryParseExact(
                        (date ?? string.Empty).Trim(),
                        "yyyy-MM-dd",
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out DateOnly parsed)
                        ? parsed
                        : DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));

                return Ok(await _repository.GetActiveAsync(supplierCode ?? string.Empty, day, null, regularOnly));
            },
            "Failed to load the cards in force.");
    }

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> GetById(
        Guid publicId)
    {
        long? id =
            await IdOf(publicId);

        if (id == null)
        {
            return NotFound("Price card not found.");
        }

        ProductPricingMotorBikesDto? item =
            await _repository.GetByIdAsync(id.Value);

        return item == null
            ? NotFound("Price card not found.")
            : Ok(item);
    }


    //===========================================================
    // Draft
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateProductPricingMotorBikesDto dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateProductPricingMotorBikesDto(), userId)),
            "Failed to save the price card.");
    }

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        [FromBody] UpdateProductPricingMotorBikesDto dto)
    {
        long? id =
            await IdOf(publicId);

        if (id == null)
        {
            return NotFound("Price card not found.");
        }

        long userId = UserId;

        return await Guarded(
            "Update",
            async () => Ok(await _repository.UpdateAsync(id.Value, dto ?? new UpdateProductPricingMotorBikesDto(), userId)),
            "Failed to save the price card.");
    }

    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? id =
            await IdOf(publicId);

        if (id == null)
        {
            return NotFound("Price card not found.");
        }

        long userId = UserId;

        return await Guarded(
            "Delete",
            async () =>
            {
                await _repository.DeleteAsync(id.Value, userId);

                return NoContent();
            },
            "Failed to delete the price card.");
    }


    //===========================================================
    // Post / Cancel
    //===========================================================

    [HttpPut("{publicId:guid}/post")]
    public async Task<IActionResult> Post(
        Guid publicId)
    {
        long? id =
            await IdOf(publicId);

        if (id == null)
        {
            return NotFound("Price card not found.");
        }

        long userId = UserId;

        return await Guarded(
            "Post",
            async () => Ok(await _repository.PostAsync(id.Value, userId)),
            "Failed to post the price card.");
    }

    [HttpPut("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(
        Guid publicId,
        [FromBody] CancelProductPricingMotorBikesDto? dto)
    {
        long? id =
            await IdOf(publicId);

        if (id == null)
        {
            return NotFound("Price card not found.");
        }

        long userId = UserId;

        return await Guarded(
            "Cancel",
            async () =>
            {
                await _repository.CancelAsync(id.Value, dto ?? new CancelProductPricingMotorBikesDto(), userId);

                return NoContent();
            },
            "Failed to cancel the price card.");
    }


    //===========================================================
    // Restore / History
    //===========================================================

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
                await _repository.RestoreAsync(userId)
                    ? NoContent()
                    : NotFound("There is no deleted price card draft to restore."),
            "Failed to restore the price card.");
    }

    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _repository.GetHistoryAsync()),
            "Failed to load the price card history.");
    }

    [HttpGet("{publicId:guid}/history")]
    public async Task<IActionResult> GetEntityHistory(
        Guid publicId)
    {
        long? id =
            await IdOf(publicId);

        if (id == null)
        {
            return NotFound("Price card not found.");
        }

        return await Run(
            async () => Ok(await _repository.GetEntityHistoryAsync(id.Value)),
            "Failed to load the price card history.");
    }
}
