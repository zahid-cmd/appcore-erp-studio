//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;
using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.SecurityPermission.RoleManagement;

//===============================================================
// Activity Assignment Controller
//===============================================================

[ApiController]

[Route("api/security-permission/role-management/activity-assignment")]

public class ActivityAssignmentController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IActivityAssignmentRepository _repository;

    private readonly IActivityHistoryRepository _historyRepository;

    //===========================================================
    // Constructor
    //===========================================================

    public ActivityAssignmentController(
        IActivityAssignmentRepository repository,
        IActivityHistoryRepository historyRepository)
    {
        _repository =
            repository;

        _historyRepository =
            historyRepository;
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<ActivityAssignmentDto>> GetDefaults()
    {
        ActivityAssignmentDto result =
            await _repository.GetDefaultsAsync();

        return Ok(result);
    }

    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ActivityAssignmentDto>>> GetAll()
    {
        List<ActivityAssignmentDto> result =
            await _repository.GetAllAsync();

        return Ok(result);
    }

    //===========================================================
    // Get List History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetListHistory()
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetListHistoryAsync(

                "Security & Permission",

                "Activity Assignment"
            );

        return Ok(history);
    }

    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<ActivityAssignmentDto>> GetById(
        long id)
    {
        ActivityAssignmentDto? result =
            await _repository.GetByIdAsync(id);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    //===========================================================
    // Get By Role Profile Id
    //===========================================================

    [HttpGet("role-profile/{roleProfileId:long}")]

    public async Task<ActionResult<ActivityAssignmentDto>>
    GetByRoleProfileId(
        long roleProfileId)
    {
        ActivityAssignmentDto? result =
            await _repository.GetByRoleProfileIdAsync(
                roleProfileId);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory(
        long id)
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetHistoryAsync(

                "Security & Permission",

                "Activity Assignment",

                id
            );

        return Ok(history);
    }

    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateActivityAssignmentDto dto)
    {
        long id =
            await _repository.CreateAsync(dto);

        return Ok(id);
    }

    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateActivityAssignmentDto dto)
    {
        bool updated =
            await _repository.UpdateAsync(dto);

        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }

    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        bool deleted =
            await _repository.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    //===========================================================
    // Restore Last Deleted
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        bool restored =
            await _repository.RestoreLastDeletedAsync();

        if (!restored)
        {
            return NotFound();
        }

        return NoContent();
    }
}