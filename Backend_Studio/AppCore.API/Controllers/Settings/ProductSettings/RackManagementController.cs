//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Settings.ProductSettings;


//===============================================================
// Rack Management Controller
//
// Defaults
//   GET    defaults?warehouseId=n   next rack code for a warehouse
//
// Delete / Restore conflicts (parts on the rack, deleted
// warehouse, name taken) return 409.
//===============================================================

[ApiController]

[Route("api/settings/product-settings/rack-management")]

public class RackManagementController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IRackManagementRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<RackManagementController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public RackManagementController(
        IRackManagementRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<RackManagementController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<RackManagementDto>>> GetAll()
    {
        try
        {
            return Ok(
                await _repository.GetAllAsync());
        }
        catch (Exception ex)
        {
            // Usually a missing table / column : run Code Synchronization
            // (or RackManagement_Tables.sql) for RackManagements and
            // SparePartLocations.
            _logger.LogError(ex, "Rack list failed.");

            return StatusCode(
                500,
                $"Racks could not be loaded. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<RackManagementDefaultsDto>> GetDefaults(
        [FromQuery] long warehouseId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    warehouseId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<RackManagementDto>> GetById(
        long id)
    {
        RackManagementDto? rack =
            await _repository.GetByIdAsync(id);

        if (rack == null)
        {
            return NotFound();
        }

        return Ok(rack);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateRackManagementDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            return Ok(
                await _repository.CreateAsync(
                    dto,
                    userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Rack create failed.");

            return StatusCode(500, "Rack could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateRackManagementDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
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
            _logger.LogError(ex, "Rack update failed. Id {RackManagementId}", dto.RackManagementId);

            return StatusCode(500, "Rack could not be updated. Please try again.");
        }
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
           long userId = this.CurrentUserId();

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
           long userId = this.CurrentUserId();

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted racks available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Product Settings",
                "RackManagement"));
    }
}