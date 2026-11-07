//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Platform.EffectiveAccess.Interfaces;

using AppCore.Application.Settings.ProductSettings;

using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Settings.ProductSettings;


//===============================================================
// Rack Management Controller
//
// Racks
//   GET    ''                         live racks (zone, assignment,
//                                     shelves with bins, totals)
//   GET    defaults?warehouseId=n     next rack code / name, zones
//                                     of the warehouse, categories
//   GET    {id}
//   GET    {id}/bins                  every shelf / bin of the rack
//                                     with its holder (form preview)
//   GET    bins?warehouseId=&sparePartId=&accessoryId=&activeOnly=
//                                     the rack map of a warehouse
//                                     (the item's own bin is free)
//   POST   ''                         (Add)
//   PUT    ''                         (Update)
//   DELETE {id}                       (Delete; 409 while items use it)
//   PUT    restore                    latest deleted rack (Restore)
//   GET    history
//
// Zones (Zones tab)
//   GET    zones?warehouseId=         (0 = every warehouse)
//   GET    zones/defaults?warehouseId=
//   GET    zones/{id}
//   POST   zones                      (Add)
//   PUT    zones/{id}                 (Update)
//   DELETE zones/{id}                 (Delete; 409 while racks use it)
//   PUT    zones/{id}/restore         (Restore)
//   PUT    zones/restore              latest deleted zone (Restore)
//   GET    zones/history
//
// Errors : { message } with 400 (input or rule broken), 403 (no
// permission), 404 (not found), 409 (delete / restore refused),
// 500 (with the database's reason)
//===============================================================

[ApiController]

[Route("api/settings/product-settings/rack-management")]

public class RackManagementController
    : ControllerBase
{
    private const string PageRoute =
        "/inventory-management/%/rack-management";

    private readonly IRackManagementRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<RackManagementController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();

    public RackManagementController(
        IRackManagementRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<RackManagementController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

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
                $"You do not have the \"{activity}\" permission on Rack Management.");
    }


    //===========================================================
    // Run an action with the standard error answers
    //
    // ruleStatus : the answer for a broken rule (400; 409 for
    // delete / restore)
    //===========================================================

    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> action,
        string failure,
        int ruleStatus = StatusCodes.Status400BadRequest
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
            return Fail(ruleStatus, ex.Message);
        }
        catch (Exception ex)
        {
            // Usually a missing table / column : run
            // StorageBins_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);

            return Fail(
                StatusCodes.Status500InternalServerError,
                $"{failure} {ex.GetBaseException().Message}");
        }
    }

    private async Task<IActionResult> Guarded
    (
        string activity,
        Func<Task<IActionResult>> action,
        string failure,
        int ruleStatus = StatusCodes.Status400BadRequest
    )
    {
        IActionResult? denied =
            await DenyAsync(activity);

        return denied ?? await Run(action, failure, ruleStatus);
    }


    //===========================================================
    //===========================================================
    // RACKS
    //===========================================================
    //===========================================================


    //===========================================================
    // Read
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync()),
            "Racks could not be loaded.");
    }

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] long warehouseId)
    {
        return Run(
            async () => Ok(await _repository.GetDefaultsAsync(warehouseId)),
            "Rack defaults could not be loaded.");
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
                RackManagementDto? rack =
                    await _repository.GetByIdAsync(id);

                return rack == null
                    ? Fail(StatusCodes.Status404NotFound, "Rack not found.")
                    : Ok(rack);
            },
            "The rack could not be loaded.");
    }

    [HttpGet("{id:long}/bins")]
    public Task<IActionResult> GetBins(
        long id)
    {
        return Run(
            async () =>
            {
                RackMapDto? rack =
                    await _repository.GetBinsAsync(id);

                return rack == null
                    ? Fail(StatusCodes.Status404NotFound, "Rack not found.")
                    : Ok(rack);
            },
            "The bins of the rack could not be loaded.");
    }

    [HttpGet("bins")]
    public Task<IActionResult> GetWarehouseBins(
        [FromQuery] long warehouseId,
        [FromQuery] long sparePartId,
        [FromQuery] long accessoryId,
        [FromQuery] bool activeOnly)
    {
        return Run(
            async () => Ok(await _repository.GetWarehouseBinsAsync(warehouseId, sparePartId, accessoryId, activeOnly)),
            "The racks of the warehouse could not be loaded.");
    }


    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public Task<IActionResult> Create(
        [FromBody] CreateRackManagementDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateAsync(dto ?? new CreateRackManagementDto(), userId)),
            "Rack could not be saved.");
    }

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        [FromBody] UpdateRackManagementDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        dto ??= new UpdateRackManagementDto();

        dto.RackManagementId =
            id;

        long userId = UserId;

        return await Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateAsync(dto ?? new UpdateRackManagementDto(), userId);

                return NoContent();
            },
            "Rack could not be updated.");
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
            "Rack could not be deleted.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
            {
                bool restored =
                    await _repository.RestoreAsync(userId);

                return restored
                    ? (IActionResult)NoContent()
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted racks available to restore.");
            },
            "Rack could not be restored.",
            StatusCodes.Status409Conflict);
    }

    [HttpGet("history")]
    public Task<IActionResult> GetHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Product Settings", "RackManagement")),
            "Rack history could not be loaded.");
    }


    //===========================================================
    //===========================================================
    // ZONES
    //===========================================================
    //===========================================================

    [HttpGet("zones")]
    public Task<IActionResult> GetZones(
        [FromQuery] long warehouseId)
    {
        return Run(
            async () => Ok(await _repository.GetZonesAsync(warehouseId)),
            "Zones could not be loaded.");
    }

    [HttpGet("zones/defaults")]
    public Task<IActionResult> GetZoneDefaults(
        [FromQuery] long warehouseId)
    {
        return Run(
            async () => Ok(await _repository.GetZoneDefaultsAsync(warehouseId)),
            "Zone defaults could not be loaded.");
    }

    [HttpGet("zones/history")]
    public Task<IActionResult> GetZoneHistory()
    {
        return Run(
            async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Product Settings", "RackZones")),
            "Zone history could not be loaded.");
    }

    [HttpGet("zones/{id:long}")]
    public Task<IActionResult> GetZoneById(
        long id)
    {
        return Run(
            async () =>
            {
                RackZoneDto? zone =
                    await _repository.GetZoneByIdAsync(id);

                return zone == null
                    ? Fail(StatusCodes.Status404NotFound, "Zone not found.")
                    : Ok(zone);
            },
            "The zone could not be loaded.");
    }

    [HttpPost("zones")]
    public Task<IActionResult> CreateZone(
        [FromBody] CreateRackZoneDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Add",
            async () => Ok(await _repository.CreateZoneAsync(dto ?? new CreateRackZoneDto(), userId)),
            "Zone could not be saved.");
    }

    [HttpPut("zones/{id:long}")]
    public Task<IActionResult> UpdateZone(
        long id,
        [FromBody] UpdateRackZoneDto? dto)
    {
        long userId = UserId;

        return Guarded(
            "Update",
            async () =>
            {
                await _repository.UpdateZoneAsync(id, dto ?? new UpdateRackZoneDto(), userId);

                return NoContent();
            },
            "Zone could not be updated.");
    }

    [HttpDelete("zones/{id:long}")]
    public Task<IActionResult> DeleteZone(
        long id)
    {
        long userId = UserId;

        return Guarded(
            "Delete",
            async () =>
            {
                await _repository.DeleteZoneAsync(id, userId);

                return NoContent();
            },
            "Zone could not be deleted.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("zones/{id:long}/restore")]
    public Task<IActionResult> RestoreZone(
        long id)
    {
        return RestoreZoneCore(id);
    }

    [HttpPut("zones/restore")]
    public Task<IActionResult> RestoreLatestZone()
    {
        return RestoreZoneCore(0);
    }

    private Task<IActionResult> RestoreZoneCore
    (
        long id
    )
    {
        long userId = UserId;

        return Guarded(
            "Restore",
            async () =>
            {
                bool restored =
                    await _repository.RestoreZoneAsync(id, userId);

                return restored
                    ? (IActionResult)NoContent()
                    : Fail(StatusCodes.Status404NotFound, "There are no deleted zones available to restore.");
            },
            "Zone could not be restored.",
            StatusCodes.Status409Conflict);
    }
}
