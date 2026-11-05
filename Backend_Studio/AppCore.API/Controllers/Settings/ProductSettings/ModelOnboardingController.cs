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
// Model Onboarding (custom page, no CRUD)
//
//   GET  defaults   brands with their Motor Bikes category, bike
//                   types, colours, starting stock levels, code
//                   previews
//   POST            one save : Bike Model + Product Sub Category
//                   + one Motor Bike per colour (all or nothing).
//                   Returns what was made; colour images are then
//                   uploaded to motor-bikes/{publicId}/image.
//===============================================================

[ApiController]

[Route("api/settings/product-settings/model-onboarding")]

public class ModelOnboardingController : ControllerBase
{
    private readonly IModelOnboardingService _service;

    private readonly ILogger<ModelOnboardingController> _logger;


    public ModelOnboardingController(
        IModelOnboardingService service,
        ILogger<ModelOnboardingController> logger)
    {
        _service = service;
        _logger = logger;
    }


    [HttpGet("defaults")]

    public async Task<ActionResult<ModelOnboardingDefaultsDto>> GetDefaults()
    {
        return Ok(await _service.GetDefaultsAsync());
    }


    [HttpPost]

    public async Task<ActionResult<ModelOnboardingResultDto>> Onboard(
        ModelOnboardingRequestDto request)
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
            _logger.LogError(ex, "Model onboarding failed.");

            return StatusCode(500, "The model could not be onboarded. Nothing was saved. Please try again.");
        }
    }
}
