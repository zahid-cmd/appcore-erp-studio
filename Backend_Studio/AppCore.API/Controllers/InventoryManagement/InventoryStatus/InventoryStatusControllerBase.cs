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
//       ?branchId=&search=        (+ what the editor may do)
//   POST bikes/number-check   MB : live check of the editor
//   PUT  bikes/numbers        MB : save one bike's numbers
//   GET  bikes/history        MB : the bike number edits
//       (switch Edit Bike Numbers + "Update"; sold bikes : also
//       Edit Bike Numbers After Sale)
//
// Cost and value (always incl. the input VAT claimed at
// purchase) are sent only when the user has "View Cost" on
// the page (Role + Special Assignment); otherwise they are 0 and
// CanViewCost is false.
//===============================================================

public abstract class InventoryStatusControllerBase : ControllerBase
{
    private readonly IInventoryStatusRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;

    private const string ViewCost = "View Cost";

    // Edit Bike Numbers needs the page's Update action
    private const string UpdateActivity = "Update";


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
                $"{failure} {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Stock list
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetStock(
        [FromQuery] long branchId,
        [FromQuery] long warehouseId,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.GetStockAsync(
                        PageType,
                        branchId,
                        warehouseId,
                        await CanViewCostAsync(),
                        false,
                        DateOf(from),
                        DateOf(to))),
            "Failed to load the stock.");
    }


    // yyyy-MM-dd → date (null when empty or not a date)
    private static DateOnly? DateOf(string? text) =>
        DateOnly.TryParseExact(
            (text ?? string.Empty).Trim(),
            "yyyy-MM-dd",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None,
            out DateOnly date)
            ? date
            : null;


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

    // Motor Bike Stock › Free Accessories (cost : the Motor Bike
    // Stock page's View Cost)
    [HttpGet("bike-accessories")]
    public Task<IActionResult> GetBikeAccessories(
        [FromQuery] long branchId,
        [FromQuery] long warehouseId,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        if (PageType != "MB")
        {
            return Task.FromResult<IActionResult>(
                NotFound("Free accessories are listed on the Motor Bike Stock page."));
        }

        return Run(
            async () =>
                Ok(
                    await _repository.GetBikeAccessoriesStockAsync(
                        branchId,
                        warehouseId,
                        await CanViewCostAsync(),
                        DateOf(from),
                        DateOf(to))),
            "Failed to load the free accessories.");
    }


    [HttpGet("bike-accessories/{productId:long}/card")]
    public Task<IActionResult> GetBikeAccessoryCard(
        long productId,
        [FromQuery] long branchId,
        [FromQuery] long warehouseId)
    {
        if (PageType != "MB")
        {
            return Task.FromResult<IActionResult>(
                NotFound("Free accessories are listed on the Motor Bike Stock page."));
        }

        return Run(
            async () =>
            {
                InventoryStockCardDto? card =
                    await _repository.GetBikeAccessoryCardAsync(
                        productId,
                        branchId,
                        warehouseId,
                        await CanViewCostAsync());

                return card == null
                    ? NotFound("Free accessory not found.")
                    : Ok(card);
            },
            "Failed to load the stock card.");
    }


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
            {
                InventoryBikeListDto list =
                    await _repository.GetBikesAsync(
                        branchId,
                        search,
                        await CanViewCostAsync());

                InventoryBikeEditRulesDto rules =
                    await _repository.GetBikeEditRulesAsync();

                bool canUpdate =
                    rules.EditOn && await CanUpdateAsync();

                list.CanEditNumbers = canUpdate;
                list.CanEditSold = canUpdate && rules.EditSoldOn;
                list.KeyBatteryOn = rules.KeyBatteryOn;

                return Ok(list);
            },
            "Failed to load the bikes.");
    }


    //===========================================================
    // Edit Bike Numbers (MB page only)
    //===========================================================

    private Task<bool> CanUpdateAsync() =>
        _effectiveAccess.HasActivityAsync(
            UserId,
            PageRoute,
            UpdateActivity);


    private async Task<IActionResult?> DenyEditAsync()
    {
        if (PageType != "MB")
        {
            return NotFound("Bikes are edited on the Motor Bike Stock page.");
        }

        return await CanUpdateAsync()
            ? null
            : StatusCode(
                StatusCodes.Status403Forbidden,
                "You do not have the \"Update\" permission on Motor Bike Stock.");
    }


    [HttpPost("bikes/number-check")]
    public async Task<IActionResult> CheckBikeNumbers(
        [FromBody] InventoryBikeNumbersDto? dto)
    {
        IActionResult? denied =
            await DenyEditAsync();

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
                Ok(
                    await _repository.CheckBikeNumbersAsync(
                        dto ?? new InventoryBikeNumbersDto())),
            "Failed to check the bike numbers.");
    }


    [HttpGet("bikes/history")]
    public Task<IActionResult> GetBikeHistory()
    {
        if (PageType != "MB")
        {
            return Task.FromResult<IActionResult>(
                NotFound("Bike history is on the Motor Bike Stock page."));
        }

        return Run(
            async () =>
                Ok(await _repository.GetBikeHistoryAsync()),
            "Failed to load the bike history.");
    }


    [HttpPut("bikes/numbers")]
    public async Task<IActionResult> UpdateBikeNumbers(
        [FromBody] InventoryBikeNumbersDto dto)
    {
        IActionResult? denied =
            await DenyEditAsync();

        if (denied != null)
        {
            return denied;
        }

        long userId = UserId;

        return await Run(
            async () =>
            {
                await _repository.UpdateBikeNumbersAsync(dto, userId);

                return NoContent();
            },
            "Failed to save the bike numbers.");
    }
}
