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
// Motor Bike Specifications Controller
//   GET    motor-bike-specifications                 all live specifications
//   GET    motor-bike-specifications/paged           the list page
//   GET    motor-bike-specifications/next-code       MBS-nnnn preview
//   GET    motor-bike-specifications/defaults        code, lists, suggested rows, brands, models
//   GET    motor-bike-specifications/by-model/{bikeModelId}  the model's active specification
//   GET    motor-bike-specifications/{publicId}
//   POST   motor-bike-specifications                 returns the Public Id
//   PUT    motor-bike-specifications/{publicId}
//   DELETE motor-bike-specifications/{publicId}
//   PUT    motor-bike-specifications/restore         the most recently deleted
//   GET    motor-bike-specifications/history
//===============================================================

[ApiController]
[Route("api/settings/product-settings/motor-bike-specifications")]
public class MotorBikeSpecificationsController : ControllerBase
{
    private readonly IMotorBikeSpecificationsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    public MotorBikeSpecificationsController(
        IMotorBikeSpecificationsRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<List<MotorBikeSpecificationsDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Paged (the list page)
    //===========================================================

    [HttpGet("paged")]
    public async Task<ActionResult<PagedResult<MotorBikeSpecificationsDto>>> GetPaged(
        [FromQuery] MotorBikeSpecificationsPageRequest request)
    {
        return Ok(
            await _repository.GetPagedAsync(
                request ?? new MotorBikeSpecificationsPageRequest()));
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
    public async Task<ActionResult<MotorBikeSpecificationsDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // The active specification of a bike model (Sales Invoices -
    // MB, Registration, website); 404 = none
    //===========================================================

    [HttpGet("by-model/{bikeModelId:long}")]
    public async Task<ActionResult<MotorBikeSpecificationsDto>> GetForModel(
        long bikeModelId)
    {
        MotorBikeSpecificationsDto? model =
            await _repository.GetForModelAsync(bikeModelId);

        if (model == null)
        {
            return NotFound();
        }

        return Ok(model);
    }


    //===========================================================
    // Get By Public Id
    //===========================================================

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<MotorBikeSpecificationsDto>> GetById(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        MotorBikeSpecificationsDto? model =
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
        CreateMotorBikeSpecificationsDto dto)
    {
        long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            MotorBikeSpecificationsDto? created =
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
        UpdateMotorBikeSpecificationsDto dto)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        dto.MotorBikeSpecificationId =
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
                    "There are no deleted motor bike specifications to restore.");
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
                "MotorBikeSpecifications"));
    }
}
