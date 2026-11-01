//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.StoreSetup;
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


    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(
        long id)
    {
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


    [HttpPut("{id:long}")]
    public Task<IActionResult> Update(
        long id,
        [FromBody] UpdateOpeningStockDto dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () => Ok(await _repository.UpdateAsync(id, dto, userId)),
            "Failed to save the opening stock.");
    }


    [HttpDelete("{id:long}")]
    public Task<IActionResult> Delete(
        long id)
    {
        long userId = UserId;

        return Guarded(
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

    [HttpPut("{id:long}/post")]
    public Task<IActionResult> Post(
        long id)
    {
        long userId = UserId;

        return Guarded(
            "Post",
            async () => Ok(await _repository.PostAsync(id, userId)),
            "Failed to post the opening stock.");
    }


    [HttpPut("{id:long}/cancel")]
    public Task<IActionResult> Cancel(
        long id,
        [FromBody] CancelOpeningStockDto? dto)
    {
        long userId = UserId;

        return Guarded(
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


    [HttpGet("{id:long}/history")]
    public Task<IActionResult> GetEntityHistory(
        long id)
    {
        return Run(
            async () => Ok(await _repository.GetEntityHistoryAsync(id)),
            "Failed to load the opening stock history.");
    }
}
