//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.RegistrationManagement.RegistrationProcessing;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.RegistrationManagement.RegistrationProcessing;


//===============================================================
// Registration Profiles Controller (hand-written page, NO Code
// Sync). Read only : the profiles are made by Sales Invoices - MB.
//
//   GET ?branchId=  rows + stages (branchId 0 / missing = all)
//===============================================================

[ApiController]
[Route("api/registration-management/registration-processing/registration-profiles")]
public class RegistrationProfilesController
    : ControllerBase
{
    private readonly IRegistrationProfilesRepository _repository;

    private readonly ILogger<RegistrationProfilesController> _logger;


    public RegistrationProfilesController(
        IRegistrationProfilesRepository repository,
        ILogger<RegistrationProfilesController> logger)
    {
        _repository = repository;

        _logger = logger;
    }


    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] long? branchId)
    {
        try
        {
            return Ok(await _repository.GetListAsync(branchId ?? 0));
        }
        catch (Exception ex)
        {
            // Usually the table is missing : run
            // RegistrationOnSale_Engine.sql
            _logger.LogError(ex, "Failed to load the registration profiles.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = $"Failed to load the registration profiles. {ex.GetBaseException().Message}" });
        }
    }
}
