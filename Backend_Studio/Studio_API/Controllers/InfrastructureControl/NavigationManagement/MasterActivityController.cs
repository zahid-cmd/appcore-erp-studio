//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.NavigationManagement;

//===============================================================
// Master Activity Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/navigation-management/master-activity")]

public class MasterActivityController : ControllerBase
{
    //===============================================================
    // Private Fields
    //===============================================================

    private readonly IMasterActivityRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    //===============================================================
    // Constructor
    //===============================================================

    public MasterActivityController(
        IMasterActivityRepository repository,
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

    public async Task<ActionResult<List<MasterActivityDto>>> GetAllAsync()
    {
        List<MasterActivityDto> activities =
            await _repository.GetAllAsync();

        return Ok(activities);
    }

    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<MasterActivityDto>> GetByIdAsync(
        long id)
    {
        MasterActivityDto? activity =
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

    public async Task<ActionResult<MasterActivityDefaultsDto>> GetDefaultsAsync()
    {
        MasterActivityDefaultsDto defaults =
            await _repository.GetDefaultsAsync();

        return Ok(defaults);
    }

    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> CreateAsync(
        CreateMasterActivityDto dto)
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
        UpdateMasterActivityDto dto)
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
                "There are no deleted master activities available to restore.");
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
                "Master Activity"));
    }
}