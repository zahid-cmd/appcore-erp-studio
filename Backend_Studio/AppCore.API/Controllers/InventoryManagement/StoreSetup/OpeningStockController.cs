//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.StoreSetup;
using AppCore.Application.InventoryManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock
//
//   GET ?type=MB|SP|AC          documents (type '' = all)
//   GET defaults?type=
//   POST unit-check             { PageType, OpeningStockId, Units }
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

[Route("api/inventory-management/store-setup/opening-stock")]

public class OpeningStockController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/opening-stock";

    private readonly IOpeningStockRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<OpeningStockController> _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public OpeningStockController(
        IOpeningStockRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<OpeningStockController> logger)
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
                $"You do not have the \"{activity}\" permission on Opening Stock.");
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
            "Failed to load the opening stocks.");
    }

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] InventoryDocumentPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request ?? new InventoryDocumentPageRequest())),
            "Failed to load the opening stocks.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] string? type)
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(type ?? string.Empty)),
            "Failed to load the opening stock defaults.");
    }


    [HttpPost("unit-check")]
    public Task<IActionResult> CheckUnits(
        [FromBody] OpeningStockUnitCheckDto? dto)
    {
        return Run(
            async () => Ok(await _repository.CheckUnitsAsync(dto ?? new OpeningStockUnitCheckDto())),
            "Failed to check the bike numbers.");
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

        OpeningStockDto? item =
            await _repository.GetByIdAsync(id);

        return item == null
            ? NotFound("Opening stock not found.")
            : Ok(item);
    }


    //===========================================================
    // Draft : save / change / delete
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateOpeningStockDto dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto, userId)),
            "Failed to save the opening stock.");
    }


    // Saved by the uuid in the address (point 2)
    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        [FromBody] UpdateOpeningStockDto dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Opening stock not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Update",
            async () => Ok(await _repository.UpdateAsync(id, dto, userId)),
            "Failed to save the opening stock.");
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
            "Failed to delete the opening stock.");
    }


    //===========================================================
    // Post / Cancel
    //===========================================================

    [HttpPut("{publicId:guid}/post")]
    public async Task<IActionResult> Post(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Opening stock not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Post",
            async () => Ok(await _repository.PostAsync(id, userId)),
            "Failed to post the opening stock.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(
        Guid publicId,
        [FromBody] CancelOpeningStockDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Opening stock not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Cancel",
            async () =>
            {
                await _repository.CancelAsync(id, dto ?? new CancelOpeningStockDto(), userId);

                return NoContent();
            },
            "Failed to cancel the opening stock.");
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
                    : NotFound("There is no deleted opening stock draft to restore."),
            "Failed to restore the opening stock.");
    }


    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _repository.GetHistoryAsync()),
            "Failed to load the opening stock history.");
    }


    [HttpGet("{publicId:guid}/history")]
    public async Task<IActionResult> GetEntityHistory(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Opening stock not found.");
        }

        long id =
            foundId.Value;

        return await Run(
            async () => Ok(await _repository.GetEntityHistoryAsync(id)),
            "Failed to load the opening stock history.");
    }
}
