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
// Labor Chart Controller
//===============================================================

[ApiController]

[Route("api/settings/service-settings/labor-chart")]

public class LaborChartController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly ILaborChartRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public LaborChartController(
        ILaborChartRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<LaborChartDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===============================================================
    // Get Paged (server paging; Counts = Total / Active / Inactive)
    //===============================================================

    [HttpGet("paged")]

    public async Task<IActionResult> GetPaged(
        [FromQuery] ServiceSettingsPageRequest request)
    {
        return Ok(await _repository.GetPagedAsync(request));
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<LaborChartDefaultsDto>> GetDefaults()
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

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<LaborChartDto>> GetById(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        LaborChartDto? laborChart =
            await _repository.GetByIdAsync(id);

        if (laborChart == null)
        {
            return NotFound();
        }

        return Ok(laborChart);
    }


    //===========================================================
    // Create
    //===========================================================

    // Returns the new row's Public Id
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(
        CreateLaborChartDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            LaborChartDto? created =
                await _repository.GetByIdAsync(id);

            return Ok(created?.PublicId ?? Guid.Empty);
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

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateLaborChartDto dto)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        dto.LaborChartId =
            id;

        if (!await _repository.ExistsAsync(
                dto.LaborChartId))
        {
            return NotFound();
        }

           long userId = this.CurrentUserId();

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

    [HttpDelete("{publicId:guid}")]

    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

           long userId = this.CurrentUserId();

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
            // Deletion Blocked
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
           long userId = this.CurrentUserId();

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
            // Blocked : name / code taken, or its sub category /
            // account sub group has been deleted
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted labor chart records available to restore.");
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
                "Labor Chart"));
    }
}