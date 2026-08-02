//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.DTOs;
using AppCore.Application.SecurityPermission.RoleManagement.RoleProfiles.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.SecurityPermission.RoleManagement;

//===============================================================
// Role Profiles Controller
//===============================================================

[ApiController]

[Route("api/security-permission/role-management/role-profiles")]

public class RoleProfilesController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IRoleProfileRepository _repository;

    private readonly IActivityHistoryRepository _historyRepository;

    //===========================================================
    // Constructor
    //===========================================================

    public RoleProfilesController(
        IRoleProfileRepository repository,
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

    public async Task<ActionResult<RoleProfileDefaultsDto>> GetDefaults()
    {
        RoleProfileDefaultsDto result =
            await _repository.GetDefaultsAsync();

        return Ok(result);
    }

    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<RoleProfileDto>>> GetAll()
    {
        List<RoleProfileDto> result =
            await _repository.GetAllAsync();

        return Ok(result);
    }

    //===========================================================
    // Get Available For Activity Assignment
    //===========================================================

    [HttpGet("available-for-activity-assignment")]

    public async Task<ActionResult<List<RoleProfileDto>>>
        GetAvailableForActivityAssignment()
    {
        List<RoleProfileDto> result =
            await _repository
                .GetAvailableForActivityAssignmentAsync();

        return Ok(result);
    }

    //===========================================================
    // Get List History
    //
    // Used by Role Profile List Page History Drawer
    // Shows all Create / Update / Delete activities
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetListHistory()
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetListHistoryAsync(

                "Security & Permission",

                "Role Profile"
            );

        return Ok(history);
    }

    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<RoleProfileDto>> GetById(
        long id)
    {
        RoleProfileDto? result =
            await _repository.GetByIdAsync(id);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    //===========================================================
    // Get History
    //
    // Used by Role Profile View/Form History Drawer
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory(
        long id)
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetHistoryAsync(

                "Security & Permission",

                "Role Profile",

                id
            );

        return Ok(history);
    }

    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateRoleProfileDto dto)
    {
        if (await _repository.ExistsByProfileNameAsync(dto.ProfileName))
        {
            return BadRequest(
                "Profile Name already exists.");
        }

        if (await _repository.ExistsByDisplayNameAsync(dto.DisplayName))
        {
            return BadRequest(
                "Display Name already exists.");
        }

        long id =
            await _repository.CreateAsync(dto);

        return Ok(id);
    }

    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]

    public async Task<IActionResult> Update(
        long id,
        UpdateRoleProfileDto dto)
    {
        if (id != dto.RoleProfileId)
        {
            return BadRequest();
        }

        if (await _repository.ExistsByProfileNameAsync(
            dto.ProfileName,
            dto.RoleProfileId))
        {
            return BadRequest(
                "Profile Name already exists.");
        }

        if (await _repository.ExistsByDisplayNameAsync(
            dto.DisplayName,
            dto.RoleProfileId))
        {
            return BadRequest(
                "Display Name already exists.");
        }

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
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        bool restored =
            await _repository.RestoreAsync();

        if (!restored)
        {
            return BadRequest(
                "There are no deleted role profiles available to restore.");
        }

        return NoContent();
    }
}