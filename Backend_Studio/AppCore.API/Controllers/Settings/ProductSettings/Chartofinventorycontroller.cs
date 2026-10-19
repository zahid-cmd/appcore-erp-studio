//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ProductSettings;


//===============================================================
// Chart of Inventory Controller (read-only)
//
// GET tree                          Type → Category → Sub Category + counts
// GET sub-categories/{id}/products  products of one sub category
// GET products                      all products (printing)
// GET issues                        broken / inconsistent links
//
// Responses are never cached, so the page always shows the
// current data of the product setting pages.
//===============================================================

[ApiController]

[Route("api/settings/product-settings/chart-of-inventory")]

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

public class ChartOfInventoryController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IChartOfInventoryRepository _repository;

    private readonly ILogger<ChartOfInventoryController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public ChartOfInventoryController(
        IChartOfInventoryRepository repository,
        ILogger<ChartOfInventoryController> logger)
    {
        _repository =
            repository;

        _logger =
            logger;
    }


    //===========================================================
    // Get Tree
    //===========================================================

    [HttpGet("tree")]

    public async Task<ActionResult<List<ChartOfInventoryTypeDto>>> GetTree()
    {
        try
        {
            return Ok(
                await _repository.GetTreeAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the chart of inventory tree.");

            return StatusCode(500, $"Unable to load the chart of inventory. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Get Sub Category Products
    //===========================================================

    [HttpGet("sub-categories/{subCategoryId:long}/products")]

    public async Task<ActionResult<List<ChartOfInventoryDto>>> GetSubCategoryProducts(
        long subCategoryId)
    {
        try
        {
            if (!await _repository.SubCategoryExistsAsync(subCategoryId))
            {
                return NotFound("Product Sub Category not found.");
            }

            return Ok(
                await _repository.GetSubCategoryProductsAsync(
                    subCategoryId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load products for sub category {SubCategoryId}.", subCategoryId);

            return StatusCode(500, $"Unable to load products. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Get All Products (printing)
    //===========================================================

    [HttpGet("products")]

    public async Task<ActionResult<List<ChartOfInventoryDto>>> GetAllProducts()
    {
        try
        {
            return Ok(
                await _repository.GetAllProductsAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load all products.");

            return StatusCode(500, $"Unable to load products. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Get Link Issues
    //===========================================================

    [HttpGet("issues")]

    public async Task<ActionResult<List<ChartOfInventoryIssueDto>>> GetIssues()
    {
        try
        {
            return Ok(
                await _repository.GetIssuesAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check chart of inventory links.");

            return StatusCode(500, $"Unable to check the chart of inventory. {ex.GetBaseException().Message}");
        }
    }
}