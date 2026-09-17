//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.SecurityPermission.RoleManagement;
using AppCore.Application.SecurityPermission.RoleManagement.RoleProfile.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.SecurityPermission.RoleManagement;


//===============================================================
// Role Profile Controller
//===============================================================

[ApiController]

[Route("api/security-permission/role-management/role-profile")]

public class RoleProfileController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly IRoleProfileRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===============================================================
    // Constructor
    //===============================================================

    public RoleProfileController(
        IRoleProfileRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<RoleProfileDto>>> GetAll()
    {
        List<RoleProfileDto> profiles =
            await _repository.GetAllAsync();

        return Ok(profiles);
    }


    //===============================================================
    // Get Next Code
    //===============================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode()
    {
        return Ok(
            await _repository.GetNextCodeAsync());
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<RoleProfileDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===============================================================
    // Get Suggested Display Order
    //===============================================================

    [HttpGet("suggested-display-order")]

    public async Task<ActionResult<int>> GetSuggestedDisplayOrder()
    {
        return Ok(
            await _repository.GetSuggestedDisplayOrderAsync());
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<RoleProfileDto>> GetById(
        long id)
    {
        RoleProfileDto? profile =
            await _repository.GetByIdAsync(id);

        if (profile == null)
        {
            return NotFound();
        }

        return Ok(profile);
    }


    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateRoleProfileDto dto)
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

    public async Task<IActionResult> Update(
        UpdateRoleProfileDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.RoleProfileId))
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

    public async Task<IActionResult> Delete(
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
            return NotFound(
                "There are no deleted role profiles available to restore.");
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
                "Security Permission",
                "Role Profile"));
    }
}