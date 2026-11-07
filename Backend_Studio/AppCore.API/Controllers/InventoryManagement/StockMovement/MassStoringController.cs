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
// Mass Storing
//
//   GET ?type=SP|AC             documents (type '' = all; deleted
//                               drafts included)
//   GET defaults?type=          next no, warehouses (business line),
//                               brands, categories, login branch
//   GET products?type=&warehouseId=&includeNoStock=&includePlaced=&rackId=
//                               grid rows with their current place
//                               (rackId : every product on that rack)
//   GET places?type=&warehouseId=
//                               saved places + racks / shelves
//   GET {id}
//   POST                        save draft → new id    (Add)
//   PUT {id}                    change draft           (Update)
//   DELETE {id}                 delete draft           (Delete)
//   PUT {id}/restore            restore a deleted draft (Restore)
//   PUT restore/{id}            the same
//   POST {id}/post              apply every line       (Post)
//   POST {id}/cancel            { Reason }             (Cancel)
//   GET history / GET {id}/history
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 500 (with the database's reason)
//===============================================================

[ApiController]

[Route("api/inventory-management/stock-movement/mass-storing")]

public class MassStoringController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/mass-storing";

    private readonly IMassStoringRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<MassStoringController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();

    // Branch selected at login (0 = none)
    private long BranchId => this.CurrentBranchId() ?? 0;

    public MassStoringController(
        IMassStoringRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<MassStoringController> logger)
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
                $"You do not have the \"{activity}\" permission on Mass Storing.");
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
            "Failed to load the mass storings.");
    }

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] MassStoringPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(request ?? new MassStoringPageRequest())),
            "Failed to load the mass storings.");
    }

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] string? type)
    {
        long branchId = BranchId;

        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(type ?? string.Empty, branchId)),
            "Failed to load the mass storing defaults.");
    }

    [HttpGet("products")]
    public Task<IActionResult> GetProducts(
        [FromQuery] string? type,
        [FromQuery] long warehouseId,
        [FromQuery] bool includeNoStock,
        [FromQuery] bool includePlaced,
        [FromQuery] long? rackId)
    {
        return Run(
            async () => Ok(await _repository.GetProductsAsync(type ?? string.Empty, warehouseId, includeNoStock, includePlaced, rackId)),
            "Failed to load the products of the warehouse.");
    }

    [HttpGet("places")]
    public Task<IActionResult> GetPlaces(
        [FromQuery] string? type,
        [FromQuery] long warehouseId)
    {
        return Run(
            async () => Ok(await _repository.GetPlacesAsync(type ?? string.Empty, warehouseId)),
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

        return await Run(
            async () =>
            {
                MassStoringDto? item =
                    await _repository.GetByIdAsync(id);

                return item == null
                    ? Fail(StatusCodes.Status404NotFound, "Mass storing not found.")
                    : Ok(item);
            },
            "Failed to load the mass storing.");
    }


    //===========================================================
    // Draft : save / change / delete / restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateMassStoringDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () =>
            {
                long id =
                    await _repository.CreateAsync(dto ?? new CreateMassStoringDto(), userId);

                // The uuid comes back too : save-and-post goes on by uuid
                var saved =
                    await _repository.GetByIdAsync(id);

                return Ok(new { Id = id, PublicId = saved?.PublicId });
            },
            "Failed to save the mass storing.");
    }

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        [FromBody] UpdateMassStoringDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Mass storing not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(id, dto ?? new UpdateMassStoringDto(), userId);

                return NoContent();
            },
            "Failed to save the mass storing.");
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
            "Failed to delete the mass storing.");
    }

    [HttpPut("{publicId:guid}/restore")]
    [HttpPut("restore/{publicId:guid}")]
    public async Task<IActionResult> Restore(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Mass storing not found.");
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
            "Failed to restore the mass storing.");
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
            return NotFound("Mass storing not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Post",
            async () =>
            {
                string status =
                    await _repository.PostAsync(id, userId);

                return Ok(new { Status = status });
            },
            "Failed to post the mass storing.");
    }

    [HttpPost("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(
        Guid publicId,
        [FromBody] CancelMassStoringDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Mass storing not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        return await Guarded(
            "Cancel",
            async () =>
            {
                await _repository.CancelAsync(id, dto ?? new CancelMassStoringDto(), userId);

                return NoContent();
            },
            "Failed to cancel the mass storing.");
    }


    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _repository.GetHistoryAsync()),
            "Failed to load the mass storing history.");
    }

    [HttpGet("{publicId:guid}/history")]
    public async Task<IActionResult> GetEntityHistory(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Mass storing not found.");
        }

        long id =
            foundId.Value;

        return await Run(
            async () => Ok(await _repository.GetEntityHistoryAsync(id)),
            "Failed to load the mass storing history.");
    }
}
