//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Settings.ServiceSettings;
using AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ServiceSettings;


//===============================================================
// Chart of Services Controller (read-only)
//
// GET tree                          Type → Category → Sub Category + counts
// GET sub-categories/{id}/services  services of one sub category
// GET services                      all services (printing)
// GET issues                        broken / inconsistent links
//
// Responses are never cached, so the page always shows the
// current data of the service setting pages.
//===============================================================

[ApiController]

[Route("api/settings/service-settings/chart-of-services")]

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

public class ChartOfServicesController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IChartOfServicesRepository _repository;

    private readonly ILogger<ChartOfServicesController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public ChartOfServicesController(
        IChartOfServicesRepository repository,
        ILogger<ChartOfServicesController> logger)
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

    public async Task<ActionResult<List<ChartOfServicesTypeDto>>> GetTree()
    {
        try
        {
            return Ok(
                await _repository.GetTreeAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the chart of services tree.");

            return StatusCode(500, $"Unable to load the chart of services. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Get Sub Category Services
    //===========================================================

    [HttpGet("sub-categories/{subCategoryId:long}/services")]

    public async Task<ActionResult<List<ChartOfServicesDto>>> GetSubCategoryServices(
        long subCategoryId)
    {
        try
        {
            if (!await _repository.SubCategoryExistsAsync(subCategoryId))
            {
                return NotFound("Service Sub Category not found.");
            }

            return Ok(
                await _repository.GetSubCategoryServicesAsync(
                    subCategoryId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load services for sub category {SubCategoryId}.", subCategoryId);

            return StatusCode(500, $"Unable to load services. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Get All Services (printing)
    //===========================================================

    [HttpGet("services")]

    public async Task<ActionResult<List<ChartOfServicesDto>>> GetAllServices()
    {
        try
        {
            return Ok(
                await _repository.GetAllServicesAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load all services.");

            return StatusCode(500, $"Unable to load services. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Get Link Issues
    //===========================================================

    [HttpGet("issues")]

    public async Task<ActionResult<List<ChartOfServicesIssueDto>>> GetIssues()
    {
        try
        {
            return Ok(
                await _repository.GetIssuesAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check chart of services links.");

            return StatusCode(500, $"Unable to check the chart of services. {ex.GetBaseException().Message}");
        }
    }
}