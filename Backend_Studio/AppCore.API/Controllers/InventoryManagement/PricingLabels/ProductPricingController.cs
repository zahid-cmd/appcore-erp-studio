//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.PricingLabels;
using AppCore.Application.InventoryManagement;
using AppCore.Application.Settings.ProductSettings;

using AppCore.Application.Platform.EffectiveAccess.Interfaces;

using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing (Price Change)
//
//   GET ?type=MB|SP|AC          documents (type '' = all)
//   GET defaults?type=
//   GET batches?type=&productId= in-stock batches + suggested MRP
//   POST stocks?type=  [ids]    in-stock batches of many products
//   GET new-item-setup?type=    groups / racks for new parts
//   POST new-items  [items]     create parts (Spare Parts "Add")
//   GET invoices?type=          purchase invoices to price (New)
//   GET invoice?type=&purchaseId= an invoice's received lines
//   GET {id}
//   POST                        save draft             (Add)
//   PUT {id}                    change draft           (Update)
//   DELETE {id}                 delete draft           (Delete)
//   PUT {id}/post               post                   (Post)
//   PUT {id}/cancel             { Reason }             (Cancel)
//   PUT restore                 last deleted draft     (Restore)
//   GET history / GET {id}/history
//
// 400 : input or rule broken ; 403 : no permission ;
// 404 : not found
//===============================================================

[ApiController]

[Route("api/inventory-management/pricing-labels/product-pricing")]

public class ProductPricingController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/product-pricing";

    private readonly IProductPricingRepository _repository;

    // Excel import : parts not in the database are created with the
    // Spare Parts page's own rules (codes, ledgers, location)
    private readonly ISparePartsRepository _spareParts;

    private const string SparePartsRoute =
        "/settings/%/spare-parts";

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<ProductPricingController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();

    public ProductPricingController(
        IProductPricingRepository repository,
        ISparePartsRepository spareParts,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<ProductPricingController> logger)
    {
        _repository = repository;

        _spareParts = spareParts;

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
                $"You do not have the \"{activity}\" permission on Product Pricing.");
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
    // Read
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll(
        [FromQuery] string? type)
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync(type)),
            "Failed to load the price changes.");
    }

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] InventoryDocumentPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request ?? new InventoryDocumentPageRequest())),
            "Failed to load the price changes.");
    }

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] string? type)
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(type ?? string.Empty)),
            "Failed to load the product pricing defaults.");
    }

    [HttpGet("batches")]
    public Task<IActionResult> GetBatches(
        [FromQuery] string? type,
        [FromQuery] long productId)
    {
        return Run(
            async () => Ok(await _repository.GetBatchesAsync(type ?? string.Empty, productId)),
            "Failed to load the batches of the product.");
    }

    // Excel import : many products in one call (read only)
    [HttpPost("stocks")]
    public Task<IActionResult> GetStocks(
        [FromQuery] string? type,
        [FromBody] List<long>? productIds)
    {
        return Run(
            async () => Ok(await _repository.GetStocksAsync(type ?? string.Empty, productIds ?? new List<long>())),
            "Failed to load the stock of the products.");
    }

    // Excel import : groups, sub-groups, units, racks (current branch)
    [HttpGet("new-item-setup")]
    public Task<IActionResult> GetNewItemSetup(
        [FromQuery] string? type)
    {
        long branchId =
            this.CurrentBranchId() ?? 0;

        return Run(
            async () => Ok(await _repository.GetNewItemSetupAsync(type ?? string.Empty, branchId)),
            "Failed to load the groups and racks.");
    }

    // Excel import : the parts not in the database, created one by
    // one with the Spare Parts rules (needs Spare Parts "Add"); each
    // row answers on its own
    [HttpPost("new-items")]
    public async Task<IActionResult> CreateNewItems(
        [FromBody] List<NewItemInputDto>? items)
    {
        long userId = UserId;

        bool allowed =
            await _effectiveAccess.HasActivityAsync(
                userId,
                SparePartsRoute,
                "Add");

        if (!allowed)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                "You do not have the \"Add\" permission on Spare Parts : the new parts cannot be created.");
        }

        long branchId =
            this.CurrentBranchId() ?? 0;

        return await Run(
            async () =>
            {
                NewItemSetupDto setup =
                    await _repository.GetNewItemSetupAsync("SP", branchId);

                List<NewItemResultDto> results =
                    new();

                foreach (NewItemInputDto item in items ?? new List<NewItemInputDto>())
                {
                    NewItemResultDto result =
                        new() { Key = item.Key };

                    try
                    {
                        List<SparePartLocationInputDto> locations =
                            item.RackManagementId > 0 && item.ShelfNumber > 0 && setup.WarehouseId > 0
                                ? new List<SparePartLocationInputDto>
                                {
                                    new()
                                    {
                                        WarehouseId = setup.WarehouseId,
                                        RackManagementId = item.RackManagementId,
                                        ShelfNumber = item.ShelfNumber,
                                        BinNumber = item.BinNumber > 0 ? item.BinNumber : 1
                                    }
                                }
                                : new List<SparePartLocationInputDto>();

                        result.ProductId =
                            await _spareParts.CreateAsync(
                                new CreateSparePartsDto
                                {
                                    ProductCategoryId = item.ProductCategoryId,
                                    ProductSubCategoryId = item.ProductSubCategoryId,
                                    PartNumber = item.PartNumber ?? string.Empty,
                                    PartName = item.PartName ?? string.Empty,
                                    Unit = string.IsNullOrWhiteSpace(item.Unit) ? "Pcs" : item.Unit,
                                    Remarks = "Created from the price list import",
                                    IsActive = true,
                                    Locations = locations
                                },
                                userId);

                        result.Created = true;
                    }
                    catch (InvalidOperationException ex)
                    {
                        result.Error = ex.Message;
                    }
                    catch (KeyNotFoundException ex)
                    {
                        result.Error = ex.Message;
                    }

                    results.Add(result);
                }

                return Ok(results);
            },
            "Failed to create the new parts.");
    }

    [HttpGet("invoices")]
    public Task<IActionResult> GetInvoices(
        [FromQuery] string? type)
    {
        return Run(
            async () => Ok(await _repository.GetInvoicesAsync(type ?? string.Empty)),
            "Failed to load the purchase invoices.");
    }

    [HttpGet("invoice")]
    public Task<IActionResult> GetInvoice(
        [FromQuery] string? type,
        [FromQuery] long purchaseId)
    {
        return Run(
            async () => Ok(await _repository.GetInvoiceAsync(type ?? string.Empty, purchaseId)),
            "Failed to load the purchase invoice.");
    }

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> GetById(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        ProductPricingDto? item =
            await _repository.GetByIdAsync(id);

        return item == null
            ? NotFound("Price change not found.")
            : Ok(item);
    }


    //===========================================================
    // Draft : save / change / delete
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateProductPricingDto dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto, userId)),
            "Failed to save the price change.");
    }

    [HttpPut("{id:long}")]
    public Task<IActionResult> Update(
        long id,
        [FromBody] UpdateProductPricingDto dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () => Ok(await _repository.UpdateAsync(id, dto, userId)),
            "Failed to save the price change.");
    }

    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Delete",
            async () =>
            {
                await _repository.DeleteAsync(id, userId);

                return NoContent();
            },
            "Failed to delete the price change.");
    }


    //===========================================================
    // Post / Cancel
    //===========================================================

    [HttpPut("{id:long}/post")]
    public Task<IActionResult> Post(
        long id)
    {
        long userId = UserId;

        return Guarded(
            "Post",
            async () => Ok(await _repository.PostAsync(id, userId)),
            "Failed to post the price change.");
    }

    [HttpPut("{id:long}/cancel")]
    public Task<IActionResult> Cancel(
        long id,
        [FromBody] CancelProductPricingDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Cancel",
            async () =>
            {
                await _repository.CancelAsync(id, dto ?? new CancelProductPricingDto(), userId);

                return NoContent();
            },
            "Failed to cancel the price change.");
    }


    //===========================================================
    // Restore (the most recently deleted draft) / History
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
                    : NotFound("There is no deleted price change draft to restore."),
            "Failed to restore the price change.");
    }

    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _repository.GetHistoryAsync()),
            "Failed to load the price change history.");
    }

    [HttpGet("{id:long}/history")]
    public Task<IActionResult> GetEntityHistory(
        long id)
    {
        return Run(
            async () => Ok(await _repository.GetEntityHistoryAsync(id)),
            "Failed to load the price change history.");
    }
}
