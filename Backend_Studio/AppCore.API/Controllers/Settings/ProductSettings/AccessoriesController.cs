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
// Accessories Controller
//
// Defaults
//   GET    defaults?productSubCategoryId=n   preview of the four codes
//
// No image for accessories.
//===============================================================

[ApiController]

[Route("api/settings/product-settings/accessories")]

public class AccessoriesController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IAccessoriesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly ILogger<AccessoriesController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public AccessoriesController(
        IAccessoriesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        ILogger<AccessoriesController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<AccessoriesDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<AccessoriesDefaultsDto>> GetDefaults(
        [FromQuery] long productSubCategoryId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    productSubCategoryId));
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

    public async Task<ActionResult<AccessoriesDto>> GetById(
        long id)
    {
        AccessoriesDto? accessory =
            await _repository.GetByIdAsync(id);

        if (accessory == null)
        {
            return NotFound();
        }

        return Ok(accessory);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateAccessoriesDto dto)
    {
        long userId = 1;

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
            _logger.LogError(ex, "Accessory create failed.");

            return StatusCode(500, "Accessory could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateAccessoriesDto dto)
    {
        long userId = 1;

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
            _logger.LogError(ex, "Accessory update failed. Id {AccessoryId}", dto.AccessoryId);

            return StatusCode(500, "Accessory could not be updated. Please try again.");
        }
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        long userId = 1;

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
        long userId = 1;

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted accessories available to restore.");
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
                "Accessories"));
    }
}