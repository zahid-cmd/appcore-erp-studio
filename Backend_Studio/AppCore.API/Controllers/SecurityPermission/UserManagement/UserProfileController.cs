//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Application.SecurityPermission.UserManagement.UserProfile.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.SecurityPermission.UserManagement;


//===============================================================
// User Profile Controller
//===============================================================

[ApiController]

[Route("api/security-permission/user-management/user-profile")]

public class UserProfileController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly IUserProfileRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===============================================================
    // Constructor
    //===============================================================

    public UserProfileController(
        IUserProfileRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<UserProfileDto>>> GetAll()
    {
        List<UserProfileDto> profiles =
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

    public async Task<ActionResult<UserProfileDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<UserProfileDto>> GetById(
        long id)
    {
        UserProfileDto? profile =
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
        CreateUserProfileDto dto)
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
        UpdateUserProfileDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.UserProfileId))
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
        //===========================================================
        // Verify User Profile Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }


        //===========================================================
        // Current User
        //===========================================================

        long userId = 1;


        //===========================================================
        // Delete
        //===========================================================

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return Conflict(ex.Message);
        }


        //===========================================================
        // Delete Successful
        //===========================================================

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
                "There are no deleted user profiles available to restore.");
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
                "User Profile"));
    }
}