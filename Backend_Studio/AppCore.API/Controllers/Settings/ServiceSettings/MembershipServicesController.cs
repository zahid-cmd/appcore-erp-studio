//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ServiceSettings;


//===============================================================
// Membership Services Controller
//
// Configure-only : rows come from Membership Cards. There is no
// POST, DELETE or restore endpoint.
//===============================================================

[ApiController]

[Route("api/settings/service-settings/membership-services")]

public class MembershipServicesController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IMembershipServicesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipServicesController(
        IMembershipServicesRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<MembershipServicesDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults (filter options)
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<MembershipServicesDefaultsDto>> GetDefaults()
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync());
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

    public async Task<ActionResult<MembershipServicesDto>> GetById(
        long id)
    {
        MembershipServicesDto? service =
            await _repository.GetByIdAsync(id);

        if (service == null)
        {
            return NotFound();
        }

        return Ok(service);
    }


    //===========================================================
    // Configure (Service Value, status, remarks)
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateMembershipServicesDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.MembershipServiceId))
        {
            return NotFound();
        }

           long userId = this.CurrentUserId();

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
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Service Settings",
                "Membership Services"));
    }
}