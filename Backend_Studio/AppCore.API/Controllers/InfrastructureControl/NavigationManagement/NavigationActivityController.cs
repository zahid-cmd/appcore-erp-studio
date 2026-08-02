//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.Activity.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.NavigationManagement;

//===============================================================
// Navigation Activity Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/navigation-management/navigation-activity")]

public class NavigationActivityController : ControllerBase
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly INavigationActivityRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===============================================================
    // Constructor
    //===============================================================

    public NavigationActivityController(
        INavigationActivityRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository =
            repository;

        _activityHistoryRepository =
            activityHistoryRepository;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<NavigationActivityDto>>> GetAllAsync(
        [FromQuery] long? navigationModuleId)
    {
        List<NavigationActivityDto> activities =
            await _repository.GetAllAsync(
                navigationModuleId);

        return Ok(
            activities);
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<NavigationActivityDto>> GetByIdAsync(
        long id)
    {
        NavigationActivityDto? activity =
            await _repository.GetByIdAsync(id);

        if (activity == null)
        {
            return NotFound();
        }

        return Ok(activity);
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<NavigationActivityDefaultsDto>> GetDefaultsAsync(
        [FromQuery] long? navigationModuleId)
    {
        NavigationActivityDefaultsDto defaults =
            await _repository.GetDefaultsAsync(
                navigationModuleId);

        return Ok(defaults);
    }

    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> CreateAsync(
        CreateNavigationActivityDto dto)
    {
        long userId = 1;

        long id =
            await _repository.CreateAsync(
                dto,
                userId);

        return Ok(id);
    }


    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> UpdateAsync(
        UpdateNavigationActivityDto dto)
    {
        if (!await _repository.ExistsAsync(dto.Id))
        {
            return NotFound();
        }

        long userId = 1;

        await _repository.UpdateAsync(
            dto,
            userId);

        return NoContent();
    }


    //===============================================================
    // Delete
    //===============================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> DeleteAsync(
        long id)
    {
        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

        long userId = 1;

        await _repository.DeleteAsync(
            id,
            userId);

        return NoContent();
    }

    //===============================================================
    // Restore
    //===============================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        bool restored =
            await _repository.RestoreAsync(
                userId);

        if (!restored)
        {
            return BadRequest(
                "There are no deleted navigation activities available to restore.");
        }

        return NoContent();
    }
    //===============================================================
    // Get History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Navigation Management",
                "Navigation Activity"));
    }
}