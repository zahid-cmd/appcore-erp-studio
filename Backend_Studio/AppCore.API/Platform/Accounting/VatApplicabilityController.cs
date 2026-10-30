//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Platform.Accounting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Platform.Accounting;


//===============================================================
// VAT Applicability (read only, any logged-in user)
//   GET api/platform/vat-applicability?productLine=SP&date=2026-10-29
//===============================================================

[ApiController]
[Route("api/platform/vat-applicability")]
public class VatApplicabilityController : ControllerBase
{
    private readonly IVatApplicabilityService _service;

    private readonly ILogger<VatApplicabilityController> _logger;


    public VatApplicabilityController(
        IVatApplicabilityService service,
        ILogger<VatApplicabilityController> logger)
    {
        _service = service;
        _logger = logger;
    }


    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? productLine,
        [FromQuery] string? date)
    {
        try
        {
            DateOnly day =
                DateOnly.TryParseExact(
                    (date ?? string.Empty).Trim(),
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out DateOnly parsed)
                    ? parsed
                    : DateOnly.FromDateTime(DateTime.Now);

            return Ok(
                await _service.GetAsync(
                    productLine ?? string.Empty,
                    day));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read VAT applicability.");

            return StatusCode(500, "Failed to read VAT applicability.");
        }
    }
}