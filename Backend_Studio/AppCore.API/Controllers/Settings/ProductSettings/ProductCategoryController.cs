//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ProductSettings;


//===============================================================
// Product Category Controller
//===============================================================

[ApiController]

[Route("api/settings/product-settings/product-category")]

public class ProductCategoryController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IProductCategoryRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public ProductCategoryController(
        IProductCategoryRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ProductCategoryDto>>> GetAll()
    {
        List<ProductCategoryDto> productCategories =
            await _repository.GetAllAsync();

        return Ok(productCategories);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        [FromQuery] string? categoryType)
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

    public async Task<ActionResult<ProductCategoryDefaultsDto>> GetDefaults(
        [FromQuery] string? categoryType)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
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
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<ProductCategoryDto>> GetById(
        long id)
    {
        ProductCategoryDto? productCategory =
            await _repository.GetByIdAsync(id);

        if (productCategory == null)
        {
            return NotFound();
        }

        return Ok(productCategory);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateProductCategoryDto dto)
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
        UpdateProductCategoryDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.ProductCategoryId))
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
        //===========================================================
        // Verify Product Category Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }


        //===========================================================
        // Current User
        //===========================================================

        long userId = 1;


        //===========================================================
        // Delete
        //===========================================================

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
            //
            // Raised by the repository when Product Sub Categories
            // or Product Masters still exist under this Category.
            // Returned as HTTP 409 with a plain-text message for
            // the "Delete Blocked" toast.
            //=======================================================

            return Conflict(ex.Message);
        }


        //===========================================================
        // Delete Successful
        //===========================================================

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
            // Blocked : name / code taken, or a class is missing
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted product categories available to restore.");
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
                "Product Settings",
                "Product Category"));
    }
}