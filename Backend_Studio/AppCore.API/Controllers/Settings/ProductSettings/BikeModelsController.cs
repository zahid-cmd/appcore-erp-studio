//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.Paging;
using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ProductSettings;


//===============================================================
// Bike Models Controller
//   GET    bike-models                 all live models (dropdowns)
//   GET    bike-models/paged           the list page
//   GET    bike-models/next-code       BMD-nnnn preview
//   GET    bike-models/defaults        code, brands, bike types
//   GET    bike-models/{publicId}
//   POST   bike-models                 returns the Public Id
//   PUT    bike-models/{publicId}
//   DELETE bike-models/{publicId}
//   PUT    bike-models/restore         the most recently deleted
//   GET    bike-models/history
//===============================================================

[ApiController]
[Route("api/settings/product-settings/bike-models")]
public class BikeModelsController : ControllerBase
{
    private readonly IBikeModelsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    public BikeModelsController(
        IBikeModelsRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<List<BikeModelsDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Paged (the list page)
    //===========================================================

    [HttpGet("paged")]
    public async Task<ActionResult<PagedResult<BikeModelsDto>>> GetPaged(
        [FromQuery] BikeModelsPageRequest request)
    {
        return Ok(
            await _repository.GetPagedAsync(
                request ?? new BikeModelsPageRequest()));
    }


    //===========================================================
    // Next Code / Defaults
    //===========================================================

    [HttpGet("next-code")]
    public async Task<ActionResult<string>> GetNextCode()
    {
        return Ok(
            await _repository.GetNextCodeAsync());
    }


    [HttpGet("defaults")]
    public async Task<ActionResult<BikeModelsDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get By Public Id
    //===========================================================

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<BikeModelsDto>> GetById(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        BikeModelsDto? model =
            await _repository.GetByIdAsync(found.Value);

        if (model == null)
        {
            return NotFound();
        }

        return Ok(model);
    }


    //===========================================================
    // Create : returns the new row's Public Id
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<Guid>> Create(
        CreateBikeModelsDto dto)
    {
        long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            BikeModelsDto? created =
                await _repository.GetByIdAsync(id);

            return Ok(created?.PublicId ?? Guid.Empty);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Update : the row comes from the link's Public Id; an id in
    // the body is ignored
    //===========================================================

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateBikeModelsDto dto)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        dto.BikeModelId =
            found.Value;

        long userId = this.CurrentUserId();

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
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

        long userId = this.CurrentUserId();

        try
        {
            await _repository.DeleteAsync(
                found.Value,
                userId);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            // Deletion blocked : a "Delete Blocked" toast
            return Conflict(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Restore (the most recently deleted)
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
                    "There are no deleted bike models to restore.");
            }
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Product Settings",
                "BikeModels"));
    }
}
