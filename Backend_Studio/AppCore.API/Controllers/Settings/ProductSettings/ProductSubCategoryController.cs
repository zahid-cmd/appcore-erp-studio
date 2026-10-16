//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ProductSettings;


//===============================================================
// Product Sub Category Controller
//===============================================================

[ApiController]

[Route("api/settings/product-settings/product-sub-category")]

public class ProductSubCategoryController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IProductSubCategoryRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public ProductSubCategoryController(
        IProductSubCategoryRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ProductSubCategoryDto>>> GetAll()
    {
        List<ProductSubCategoryDto> productSubCategories =
            await _repository.GetAllAsync();

        return Ok(productSubCategories);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        long productCategoryId)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    productCategoryId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<ProductSubCategoryDefaultsDto>> GetDefaults(
        long productCategoryId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    productCategoryId));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
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

    public async Task<ActionResult<ProductSubCategoryDto>> GetById(
        long id)
    {
        ProductSubCategoryDto? productSubCategory =
            await _repository.GetByIdAsync(id);

        if (productSubCategory == null)
        {
            return NotFound();
        }

        return Ok(productSubCategory);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateProductSubCategoryDto dto)
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateProductSubCategoryDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.ProductSubCategoryId))
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

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        //===========================================================
        // Verify Product Sub Category Exists
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            //=======================================================
            // Deletion Blocked
            //
            // Raised by the repository when Product Masters still
            // exist under this Sub Category. Returned as HTTP 409
            // with a plain-text message for the "Delete Blocked"
            // toast.
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

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted product sub categories available to restore.");
            }
        }
        catch (InvalidOperationException ex)
        {
            //=======================================================
            // Restore Blocked
            //
            // Parent Product Category is deleted, or the name is
            // already used by another active sub category.
            //=======================================================

            return Conflict(ex.Message);
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
                "Product Sub Category"));
    }
}