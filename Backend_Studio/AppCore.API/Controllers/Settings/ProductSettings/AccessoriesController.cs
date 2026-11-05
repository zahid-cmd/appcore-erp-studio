//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.Paging;
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
//
// A row is opened / changed by its Public Id (uuid), never by
// the internal number :
//
//   GET    paged          the list page (one page, server side;
//                         see AccessoriesPageRequest)
//   GET    {publicId}     one row
//   POST                  create -> its Public Id
//   PUT    {publicId}     update
//   DELETE {publicId}     delete
//
// GET (all) stays for the dropdowns / lookups of other pages.
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
    // Get Paged (the list page)
    //===========================================================

    [HttpGet("paged")]
    public async Task<ActionResult<PagedResult<AccessoriesDto>>> GetPaged(
        [FromQuery] AccessoriesPageRequest request)
    {
        return Ok(
            await _repository.GetPagedAsync(
                request ?? new AccessoriesPageRequest()));
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

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<AccessoriesDto>> GetByPublicId(
        Guid publicId)
    {
        long? id =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (id == null)
        {
            return NotFound();
        }

        AccessoriesDto? row =
            await _repository.GetByIdAsync(id.Value);

        if (row == null)
        {
            return NotFound();
        }

        return Ok(row);
    }


    //===========================================================
    // Create
    //===========================================================

    // Returns the new row's Public Id
    [HttpPost]

    public async Task<ActionResult<Guid>> Create(
        CreateAccessoriesDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            AccessoriesDto? created =
                await _repository.GetByIdAsync(id);

            return Ok(created?.PublicId ?? Guid.Empty);
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

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]

    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateAccessoriesDto dto)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        dto.AccessoryId =
            id;

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
            _logger.LogError(ex, "Accessory update failed. Id {AccessoryId}", dto.AccessoryId);

            return StatusCode(500, "Accessory could not be updated. Please try again.");
        }
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