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
// Service Category Controller
//===============================================================

[ApiController]

[Route("api/settings/service-settings/service-category")]

public class ServiceCategoryController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IServiceCategoryRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public ServiceCategoryController(
        IServiceCategoryRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ServiceCategoryDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Next Code (per Category Type)
    //   next-code?categoryType=Brand Services        -> BRS-nnn
    //   next-code?categoryType=Differential Services -> DRS-nnn
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        [FromQuery] string categoryType)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    categoryType));
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
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<ServiceCategoryDefaultsDto>> GetDefaults()
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
            // e.g. no Income class yet
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<ServiceCategoryDto>> GetById(
        long id)
    {
        ServiceCategoryDto? serviceCategory =
            await _repository.GetByIdAsync(id);

        if (serviceCategory == null)
        {
            return NotFound();
        }

        return Ok(serviceCategory);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateServiceCategoryDto dto)
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
        UpdateServiceCategoryDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.ServiceCategoryId))
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
            // Deletion Blocked (sub groups / sub categories exist)
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
            // Blocked : name / code / brand taken, brand deleted,
            // or the Income class is missing
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted service categories available to restore.");
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
                "Service Category"));
    }
}