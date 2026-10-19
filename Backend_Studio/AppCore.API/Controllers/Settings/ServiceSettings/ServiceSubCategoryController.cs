//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ServiceSettings;


//===============================================================
// Service Sub Category Controller
//===============================================================

[ApiController]

[Route("api/settings/service-settings/service-sub-category")]

public class ServiceSubCategoryController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IServiceSubCategoryRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public ServiceSubCategoryController(
        IServiceSubCategoryRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ServiceSubCategoryDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<ServiceSubCategoryDefaultsDto>> GetDefaults()
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync());
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<ServiceSubCategoryDto>> GetById(
        long id)
    {
        ServiceSubCategoryDto? serviceSubCategory =
            await _repository.GetByIdAsync(id);

        if (serviceSubCategory == null)
        {
            return NotFound();
        }

        return Ok(serviceSubCategory);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateServiceSubCategoryDto dto)
    {
        long userId = 1;

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            return Ok(id);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateServiceSubCategoryDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.ServiceSubCategoryId))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            //=======================================================
            // Deletion Blocked (its sub group still has ledgers)
            // HTTP 409 with a plain-text message for the toast.
            //=======================================================

            return Conflict(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        bool restored;

        try
        {
            restored =
                await _repository.RestoreAsync(
                    userId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            // Blocked : name / code / type taken, or its category /
            // income group has been deleted
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted service sub categories available to restore.");
        }

        return NoContent();
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Service Settings",
                "Service Sub Category"));
    }
}