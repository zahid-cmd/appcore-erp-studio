//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.MotorBikeSales;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries Controller (hand-written page, 2026-11-10;
// replaces the generated one : NEVER run Code Sync for it)
//
//   GET  defaults                 switches + rights
//   GET  ''?tab=&search=          Pending / Delivered / Undone
//   GET  sheet/{lineId}           a new delivery of a sold bike
//   GET  {publicId}               a saved delivery
//   GET  history
//   POST ''                       save (final)       : Add
//   PUT  {publicId}/undo          undo with a reason : Undo Delivery
//
// The login branch limits the list and the deliveries.
//===============================================================

[ApiController]
[Route("api/sales-operations/motor-bike-sales/bike-deliveries")]
public class BikeDeliveriesController
    : ControllerBase
{
    private const string PageRoute =
        "/sales-operations/%/bike-deliveries";

    private const string ActivityUndo =
        "Undo Delivery";

    private readonly IBikeDeliveriesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<BikeDeliveriesController> _logger;

    private long UserId => this.CurrentUserId();

    public BikeDeliveriesController(
        IBikeDeliveriesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<BikeDeliveriesController> logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
        _effectiveAccess = effectiveAccess;
        _logger = logger;
    }

    private ObjectResult Fail(int statusCode, string message) =>
        StatusCode(statusCode, new { message });

    private Task<bool> HasAsync(string activity) =>
        _effectiveAccess.HasActivityAsync(UserId, PageRoute, activity);

    private long? Branch()
    {
        long? id = this.CurrentBranchId();

        return id.HasValue && id.Value > 0 ? id : null;
    }

    private async Task<IActionResult> Run(Func<Task<IActionResult>> action, string failure)
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
            // Usually the tables are missing : run
            // BikeDeliveries_Pdi_Engine.sql
            _logger.LogError(ex, "{Failure}", failure);
            return Fail(StatusCodes.Status500InternalServerError, $"{failure} {ex.GetBaseException().Message}");
        }
    }

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(
            async () =>
            {
                BikeDeliveryDefaultsDto defaults = await _repository.GetDefaultsAsync();
                defaults.CanDeliver = await HasAsync("Add");
                defaults.CanUndo = await HasAsync(ActivityUndo);
                return Ok(defaults);
            },
            "Bike delivery defaults could not be loaded.");

    [HttpGet]
    public Task<IActionResult> GetList([FromQuery] string? tab, [FromQuery] string? search) =>
        Run(async () => Ok(await _repository.GetListAsync(Branch(), tab ?? "Pending", search ?? string.Empty)), "Bike deliveries could not be loaded.");

    [HttpGet("sheet/{lineId:long}")]
    public Task<IActionResult> GetSheet(long lineId) =>
        Run(
            async () =>
            {
                BikeDeliverySheetDto sheet = await _repository.GetSheetAsync(lineId, Branch());
                sheet.Defaults.CanDeliver = await HasAsync("Add");
                sheet.Defaults.CanUndo = await HasAsync(ActivityUndo);
                return Ok(sheet);
            },
            "The bike could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Sales Operations", "BikeDeliveries")), "Bike delivery history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(
            async () =>
            {
                BikeDeliveryDto delivery = await _repository.GetAsync(publicId);
                delivery.CanUndo = delivery.Status == "Delivered" && await HasAsync(ActivityUndo);
                return Ok(delivery);
            },
            "The bike delivery could not be loaded.");

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveBikeDeliveryDto? dto)
    {
        if (!await HasAsync("Add"))
        {
            return Fail(StatusCodes.Status403Forbidden, "You do not have the \"Add\" permission on Bike Deliveries.");
        }

        long userId = UserId;

        return await Run(async () => Ok(await _repository.CreateAsync(dto ?? new SaveBikeDeliveryDto(), Branch(), userId)), "The delivery could not be saved.");
    }

    [HttpPut("{publicId:guid}/undo")]
    public async Task<IActionResult> Undo(Guid publicId, [FromBody] UndoBikeDeliveryDto? dto)
    {
        if (!await HasAsync(ActivityUndo))
        {
            return Fail(StatusCodes.Status403Forbidden, "Only an admin with \"Undo Delivery\" can undo a delivery.");
        }

        long userId = UserId;

        return await Run(
            async () =>
            {
                await _repository.UndoAsync(publicId, dto?.Reason ?? string.Empty, userId);
                return NoContent();
            },
            "The delivery could not be undone.");
    }
}
