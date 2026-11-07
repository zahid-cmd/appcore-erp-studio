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
// Price Adjustment
//
//   GET ?type=MB|SP|AC          documents (type '' = all; deleted
//                               drafts included)
//   GET defaults?type=          next no, products, brands, suppliers
//   POST analyse                stock on the cut-off date + amounts
//   GET {id}
//   POST                        save draft → new id    (Add)
//   PUT {id}                    change draft           (Update)
//   DELETE {id}                 delete draft           (Delete)
//   PUT {id}/restore            restore a deleted draft (Restore)
//   POST {id}/post              post                   (Post)
//   POST {id}/cancel            { Reason }             (Cancel)
//   GET history / GET {id}/history
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found)
//===============================================================

[ApiController]

[Route("api/inventory-management/pricing-labels/price-adjustment")]

public class PriceAdjustmentController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/price-adjustment";

    private readonly IPriceAdjustmentRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<PriceAdjustmentController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();

    public PriceAdjustmentController(
        IPriceAdjustmentRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PriceAdjustmentController> logger)
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
                $"You do not have the \"{activity}\" permission on Price Adjustment.");
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
        catch (InvalidOperationException ex)
        {
            return Fail(StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(
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
            "Failed to load the price adjustments.");
    }

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] PriceAdjustmentPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request ?? new PriceAdjustmentPageRequest())),
            "Failed to load the price adjustments.");
    }

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] string? type)
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(type ?? string.Empty)),
            "Failed to load the price adjustment defaults.");
    }

    // Read only : nothing is saved
    [HttpPost("analyse")]
    public Task<IActionResult> Analyse(
        [FromBody] PriceAdjustmentAnalyseInputDto? input)
    {
        return Run(
            async () => Ok(await _repository.AnalyseAsync(input ?? new PriceAdjustmentAnalyseInputDto())),
            "Failed to analyse the stock.");
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

        return await Run(
            async () =>
            {
                PriceAdjustmentDto? item =
                    await _repository.GetByIdAsync(id);

                return item == null
                    ? Fail(StatusCodes.Status404NotFound, "Price adjustment not found.")
                    : Ok(item);
            },
            "Failed to load the price adjustment.");
    }


    //===========================================================
    // Draft : save / change / delete / restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreatePriceAdjustmentDto? dto)
    {
        long userId = UserId;

        long branchId =
            this.CurrentBranchId() ?? 0;

        return Guarded(
            "Add",
            async () =>
            {
                long id =
                    await _repository.CreateAsync(dto ?? new CreatePriceAdjustmentDto(), branchId, userId);

                // The uuid comes back too : save-and-post goes on by uuid
                var saved =
                    await _repository.GetByIdAsync(id);

                return Ok(new { Id = id, PublicId = saved?.PublicId });
            },
            "Failed to save the price adjustment.");
    }

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        [FromBody] UpdatePriceAdjustmentDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Price adjustment not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(id, dto ?? new UpdatePriceAdjustmentDto(), userId);

                return NoContent();
            },
            "Failed to save the price adjustment.");
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
            "Failed to delete the price adjustment.");
    }

    [HttpPut("{publicId:guid}/restore")]
    public async Task<IActionResult> Restore(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Price adjustment not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Restore",
            async () =>
            {
                await _repository.RestoreAsync(id, userId);

                return NoContent();
            },
            "Failed to restore the price adjustment.");
    }


    //===========================================================
    // Post / Cancel
    //===========================================================

    [HttpPost("{publicId:guid}/post")]
    public async Task<IActionResult> Post(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Price adjustment not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Post",
            async () =>
            {
                await _repository.PostAsync(id, userId);

                return NoContent();
            },
            "Failed to post the price adjustment.");
    }

    [HttpPost("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(
        Guid publicId,
        [FromBody] CancelPriceAdjustmentDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Price adjustment not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Cancel",
            async () =>
            {
                await _repository.CancelAsync(id, dto ?? new CancelPriceAdjustmentDto(), userId);

                return NoContent();
            },
            "Failed to cancel the price adjustment.");
    }


    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _repository.GetHistoryAsync()),
            "Failed to load the price adjustment history.");
    }

    [HttpGet("{publicId:guid}/history")]
    public async Task<IActionResult> GetEntityHistory(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Price adjustment not found.");
        }

        long id =
            foundId.Value;

        return await Run(
            async () => Ok(await _repository.GetEntityHistoryAsync(id)),
            "Failed to load the price adjustment history.");
    }
}
