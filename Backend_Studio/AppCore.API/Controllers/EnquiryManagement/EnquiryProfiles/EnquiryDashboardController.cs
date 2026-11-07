//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Dashboard Controller (read only, NO Code Sync)
//
//   GET ''?branchId=&from=&to=&executiveId=   every figure of the
//                                             page (0 / empty = all)
//
// Errors : { message } with 500 (with the database's reason)
//===============================================================

[ApiController]
[Route("api/enquiry-management/enquiry-profiles/enquiry-dashboard")]
public class EnquiryDashboardController
    : ControllerBase
{
    private readonly IEnquiryDashboardRepository _repository;

    private readonly ILogger<EnquiryDashboardController> _logger;


    public EnquiryDashboardController(
        IEnquiryDashboardRepository repository,
        ILogger<EnquiryDashboardController> logger)
    {
        _repository = repository;
        _logger = logger;
    }


    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] EnquiryDashboardRequest request)
    {
        try
        {
            return Ok(await _repository.GetAsync(request));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "The enquiry dashboard could not be loaded.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = $"The enquiry dashboard could not be loaded. {ex.GetBaseException().Message}" });
        }
    }
}
