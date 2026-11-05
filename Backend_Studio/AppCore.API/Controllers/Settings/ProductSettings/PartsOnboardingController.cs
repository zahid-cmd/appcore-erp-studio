//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ProductSettings;


//===============================================================
// Parts & Accessories Onboarding (custom page, no CRUD)
//
//   GET  defaults   categories (Spare Parts / Lubricants /
//                   Accessories) with their sub categories,
//                   units, movement classes, starting levels
//   GET  existing   items already in a sub category (template)
//   POST analyze    checks every row; nothing is written
//   POST            one save : every row into the sub category
//                   (all or nothing)
//===============================================================

[ApiController]

[Route("api/settings/product-settings/parts-onboarding")]

public class PartsOnboardingController : ControllerBase
{
    private readonly IPartsOnboardingService _service;

    private readonly ILogger<PartsOnboardingController> _logger;


    public PartsOnboardingController(
        IPartsOnboardingService service,
        ILogger<PartsOnboardingController> logger)
    {
        _service = service;
        _logger = logger;
    }


    [HttpGet("defaults")]

    public async Task<ActionResult<PartsOnboardingDefaultsDto>> GetDefaults()
    {
        return Ok(await _service.GetDefaultsAsync());
    }


    [HttpGet("existing")]

    public async Task<ActionResult<List<PartsOnboardingExistingDto>>> GetExisting(
        [FromQuery] string productType,
        [FromQuery] long productSubCategoryId)
    {
        try
        {
            return Ok(await _service.GetExistingAsync(productType, productSubCategoryId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    [HttpPost("analyze")]

    public async Task<ActionResult<PartsOnboardingAnalysisDto>> Analyze(
        PartsOnboardingRequestDto request)
    {
        try
        {
            return Ok(await _service.AnalyzeAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Parts onboarding analyze failed.");

            return StatusCode(500, "The rows could not be checked. Please try again.");
        }
    }


    [HttpPost]

    public async Task<ActionResult<PartsOnboardingResultDto>> Onboard(
        PartsOnboardingRequestDto request)
    {
        long userId = this.CurrentUserId();

        try
        {
            return Ok(await _service.OnboardAsync(request, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Parts onboarding failed.");

            return StatusCode(500, "The items could not be onboarded. Nothing was saved. Please try again.");
        }
    }
}
