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
    // Upload User Profile Photo
    //===============================================================

    [HttpPost("{id:long}/photo")]

    public async Task<IActionResult> UploadPhoto(
        long id,
        IFormFile file)
    {
        //===========================================================
        // Verify User Profile Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound(
                "User Profile not found.");
        }


        //===========================================================
        // Validate File
        //===========================================================

        if
        (
            file == null
            ||
            file.Length == 0
        )
        {
            return BadRequest(
                "Please select a profile photo.");
        }


        //===========================================================
        // Validate File Type
        //===========================================================

        string[] allowedExtensions =
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };


        string extension =
            Path.GetExtension(
                file.FileName)
            .ToLowerInvariant();


        if
        (
            !allowedExtensions.Contains(
                extension)
        )
        {
            return BadRequest(
                "Only JPG, JPEG, PNG and WEBP image files are allowed.");
        }


        //===========================================================
        // Validate File Size
        //===========================================================

        const long maximumFileSize =
            5 * 1024 * 1024;


        if
        (
            file.Length >
            maximumFileSize
        )
        {
            return BadRequest(
                "Profile photo size cannot exceed 5 MB.");
        }


        //===========================================================
        // Upload Directory
        //===========================================================

        string webRootPath =
            Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot");


        string uploadDirectory =
            Path.Combine(
                webRootPath,
                "uploads",
                "user-photos");


        Directory.CreateDirectory(
            uploadDirectory);


        //===========================================================
        // Get Existing User Profile
        //===========================================================

        UserProfileDto? existingProfile =
            await _repository.GetByIdAsync(id);


        if
        (
            existingProfile ==
            null
        )
        {
            return NotFound(
                "User Profile not found.");
        }


        //===========================================================
        // Generate File Name
        //===========================================================

        string fileName =
            $"{Guid.NewGuid():N}{extension}";


        string physicalFilePath =
            Path.Combine(
                uploadDirectory,
                fileName);


        //===========================================================
        // Save File
        //===========================================================

        await using
        (
            FileStream stream =
                new FileStream(
                    physicalFilePath,
                    FileMode.Create)
        )
        {
            await file.CopyToAsync(
                stream);
        }


        //===========================================================
        // Relative Photo Path
        //===========================================================

        string photoPath =
            $"/uploads/user-photos/{fileName}";


        //===========================================================
        // Current User
        //===========================================================

        long userId =
            1;


        //===========================================================
        // Save Photo Path To Database
        //===========================================================

        await _repository.UpdatePhotoAsync(
            id,
            photoPath,
            userId);


        //===========================================================
        // Delete Previous Physical Photo
        //===========================================================

        if
        (
            !string.IsNullOrWhiteSpace(
                existingProfile.UserPhotoPath)
        )
        {
            DeletePhysicalPhoto(
                existingProfile.UserPhotoPath);
        }


        //===========================================================
        // Return Photo Path
        //===========================================================

        return Ok(
            photoPath);
    }


    //===============================================================
    // Delete User Profile Photo
    //===============================================================

    [HttpDelete("{id:long}/photo")]

    public async Task<IActionResult> DeletePhoto(
        long id)
    {
        //===========================================================
        // Verify User Profile Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound(
                "User Profile not found.");
        }


        //===========================================================
        // Get Existing User Profile
        //===========================================================

        UserProfileDto? existingProfile =
            await _repository.GetByIdAsync(id);


        if
        (
            existingProfile ==
            null
        )
        {
            return NotFound(
                "User Profile not found.");
        }


        //===========================================================
        // Current User
        //===========================================================

        long userId =
            1;


        //===========================================================
        // Clear Photo Path From Database
        //===========================================================

        await _repository.ClearPhotoAsync(
            id,
            userId);


        //===========================================================
        // Delete Physical Photo
        //===========================================================

        if
        (
            !string.IsNullOrWhiteSpace(
                existingProfile.UserPhotoPath)
        )
        {
            DeletePhysicalPhoto(
                existingProfile.UserPhotoPath);
        }


        //===========================================================
        // Delete Successful
        //===========================================================

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

        long userId =
            1;


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
            return Conflict(
                ex.Message);
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
        long userId =
            1;


        bool restored =
            await _repository.RestoreAsync(
                userId);


        if
        (
            !restored
        )
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


    //===============================================================
    // Delete Physical Photo
    //===============================================================

    private void DeletePhysicalPhoto(
        string photoPath)
    {
        try
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    photoPath)
            )
            {
                return;
            }


            string relativePath =
                photoPath.Trim()
                    .TrimStart(
                        '/',
                        '\\');


            string webRootPath =
                Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot");


            string physicalFilePath =
                Path.Combine(
                    webRootPath,
                    relativePath);


            if
            (
                System.IO.File.Exists(
                    physicalFilePath)
            )
            {
                System.IO.File.Delete(
                    physicalFilePath);
            }
        }
        catch
        {
            //=======================================================
            // Physical File Cleanup Failure
            //=======================================================
            // Database operation remains successful even if the
            // physical file cannot be removed.
        }
    }
}