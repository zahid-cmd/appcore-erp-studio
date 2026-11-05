//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.StockMovement;

using AppCore.Application.Platform.EffectiveAccess.Interfaces;

using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer
//
//   GET ?type=MB|SP|AC          documents (type '' = all; deleted
//                               drafts included)
//   GET defaults?type=          next no, warehouses, brands, login
//                               branch
//   GET stock?type=&warehouseId=
//                               products on hand in a warehouse
//                               (batches FIFO, MB bikes)
//   GET places?type=&warehouseId=&productIds=1,2,3
//                               saved places + racks / free shelves
//   GET {id}
//   POST                        save draft → new id    (Add)
//   PUT {id}                    change draft           (Update)
//   DELETE {id}                 delete draft           (Delete)
//   PUT {id}/restore            restore a deleted draft (Restore)
//   POST {id}/post              same branch → Completed,
//                               other branch → In Transit (Post)
//   POST {id}/receive           { ReceiveDate } (Receive; the To
//                               branch only)
//   POST {id}/cancel            { Reason }             (Cancel)
//   GET history / GET {id}/history
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission / not the receiving branch), 404 (not found)
//===============================================================

[ApiController]

[Route("api/inventory-management/stock-movement/product-transfer")]

public class ProductTransferController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/product-transfer";

    private readonly IProductTransferRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<ProductTransferController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();

    // Branch selected at login (0 = none)
    private long BranchId => this.CurrentBranchId() ?? 0;

    public ProductTransferController(
        IProductTransferRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<ProductTransferController> logger)
    {
        _repository = repository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }


    //===========================================================
    // Answers : { message }
    //===========================================================

    private ObjectResult Fail
    (
        int statusCode,
        string message
    )
    {
        return StatusCode(
            statusCode,
            new { message });
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
            : Fail(
                StatusCodes.Status403Forbidden,
                $"You do not have the \"{activity}\" permission on Product Transfer.");
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
            return Fail(StatusCodes.Status404NotFound, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Fail(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Fail(StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Failure}", failure);

            // The reason on the page too (the database's own message),
            // so a failure can be fixed without searching the console
            return Fail(
                StatusCodes.Status500InternalServerError,
                $"{failure} {ex.GetBaseException().Message}");
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
            "Failed to load the product transfers.");
    }

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] ProductTransferPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request ?? new ProductTransferPageRequest())),
            "Failed to load the product transfers.");
    }

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] string? type)
    {
        long branchId = BranchId;

        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(type ?? string.Empty, branchId)),
            "Failed to load the product transfer defaults.");
    }

    [HttpGet("stock")]
    public Task<IActionResult> GetStock(
        [FromQuery] string? type,
        [FromQuery] long warehouseId)
    {
        return Run(
            async () => Ok(await _repository.GetStockAsync(type ?? string.Empty, warehouseId)),
            "Failed to load the stock of the warehouse.");
    }

    [HttpGet("places")]
    public Task<IActionResult> GetPlaces(
        [FromQuery] string? type,
        [FromQuery] long warehouseId,
        [FromQuery] string? productIds)
    {
        return Run(
            async () => Ok(await _repository.GetPlacesAsync(type ?? string.Empty, warehouseId, productIds)),
            "Failed to load the racks of the warehouse.");
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

        long branchId = BranchId;

        return await Run(
            async () =>
            {
                ProductTransferDto? item =
                    await _repository.GetByIdAsync(id, branchId);

                return item == null
                    ? Fail(StatusCodes.Status404NotFound, "Product transfer not found.")
                    : Ok(item);
            },
            "Failed to load the product transfer.");
    }


    //===========================================================
    // Draft : save / change / delete / restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateProductTransferDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateProductTransferDto(), userId)),
            "Failed to save the product transfer.");
    }

    [HttpPut("{id:long}")]
    public Task<IActionResult> Update(
        long id,
        [FromBody] UpdateProductTransferDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(id, dto ?? new UpdateProductTransferDto(), userId);

                return NoContent();
            },
            "Failed to save the product transfer.");
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
            "Failed to delete the product transfer.");
    }

    [HttpPut("{id:long}/restore")]
    public Task<IActionResult> Restore(
        long id)
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
            {
                await _repository.RestoreAsync(id, userId);

                return NoContent();
            },
            "Failed to restore the product transfer.");
    }


    //===========================================================
    // Post (Send) / Receive / Cancel
    //===========================================================

    [HttpPost("{id:long}/post")]
    public Task<IActionResult> Post(
        long id)
    {
        long userId = UserId;

        return Guarded(
            "Post",
            async () =>
            {
                string status =
                    await _repository.PostAsync(id, userId);

                return Ok(new { Status = status });
            },
            "Failed to post the product transfer.");
    }

    [HttpPost("{id:long}/receive")]
    public Task<IActionResult> Receive(
        long id,
        [FromBody] ReceiveProductTransferDto? dto)
    {
        long userId = UserId;

        long branchId = BranchId;

        return Guarded(
            "Receive",
            async () =>
            {
                await _repository.ReceiveAsync(id, dto ?? new ReceiveProductTransferDto(), branchId, userId);

                return NoContent();
            },
            "Failed to receive the product transfer.");
    }

    [HttpPost("{id:long}/cancel")]
    public Task<IActionResult> Cancel(
        long id,
        [FromBody] CancelProductTransferDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Cancel",
            async () =>
            {
                await _repository.CancelAsync(id, dto ?? new CancelProductTransferDto(), userId);

                return NoContent();
            },
            "Failed to cancel the product transfer.");
    }


    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _repository.GetHistoryAsync()),
            "Failed to load the product transfer history.");
    }

    [HttpGet("{id:long}/history")]
    public Task<IActionResult> GetEntityHistory(
        long id)
    {
        return Run(
            async () => Ok(await _repository.GetEntityHistoryAsync(id)),
            "Failed to load the product transfer history.");
    }
}
