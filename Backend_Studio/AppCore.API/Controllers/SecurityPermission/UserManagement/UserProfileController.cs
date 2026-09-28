//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

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
    //===========================================================
    // Fields
    //===========================================================

    private readonly IUserProfileRepository _repository;

    private readonly IActivityHistoryRepository
        _activityHistoryRepository;

    private readonly IWebHostEnvironment _environment;


    //===========================================================
    // Constructor
    //===========================================================

    public UserProfileController(
        IUserProfileRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IWebHostEnvironment environment)
    {
        _repository =
            repository;

        _activityHistoryRepository =
            activityHistoryRepository;

        _environment =
            environment;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<List<UserProfileDto>>> GetAll()
    {
        List<UserProfileDto> profiles =
            await _repository.GetAllAsync();

        //=======================================================
        // Populate User Photo Data
        //=======================================================

        foreach (UserProfileDto profile in profiles)
        {
            profile.UserPhotoData =
                BuildUserPhotoData(
                    profile.UserPhotoPath);
        }

        return Ok(
            profiles);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    [HttpGet("next-code")]
    public async Task<ActionResult<string>> GetNextCode()
    {
        return Ok(
            await _repository.GetNextCodeAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]
    public async Task<ActionResult<UserProfileDefaultsDto>>
        GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]
    public async Task<ActionResult<UserProfileDto>> GetById(
        long id)
    {
        UserProfileDto? profile =
            await _repository.GetByIdAsync(
                id);

        if
        (
            profile == null
        )
        {
            return NotFound();
        }

        //=======================================================
        // Populate User Photo Data
        //=======================================================

        profile.UserPhotoData =
            BuildUserPhotoData(
                profile.UserPhotoPath);

        return Ok(
            profile);
    }


    //===========================================================
    // Build User Photo Data
    //===========================================================
    //
    // Converts the physical profile photo into a browser-ready
    // Base64 Data URL.
    //
    // Example:
    //
    // data:image/png;base64,iVBORw0KGgo...
    //
    // The database continues to store only UserPhotoPath.
    //===========================================================

    private string BuildUserPhotoData(
        string? photoPath)
    {
        //=======================================================
        // No Photo
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                photoPath)
        )
        {
            return string.Empty;
        }


        //=======================================================
        // Resolve Web Root
        //=======================================================

        string webRootPath =
            _environment.WebRootPath
            ??
            Path.Combine(
                _environment.ContentRootPath,
                "wwwroot"
            );


        //=======================================================
        // Normalize Relative Path
        //=======================================================

        string relativePath =
            photoPath
                .Trim()
                .TrimStart(
                    '/',
                    '\\'
                );


        //=======================================================
        // Resolve Physical File
        //=======================================================

        string physicalFilePath =
            Path.GetFullPath(
                Path.Combine(
                    webRootPath,
                    relativePath
                )
            );


        //=======================================================
        // Normalize Web Root
        //=======================================================

        string normalizedWebRoot =
            Path.GetFullPath(
                webRootPath
            );


        if
        (
            !normalizedWebRoot.EndsWith(
                Path.DirectorySeparatorChar
            )
        )
        {
            normalizedWebRoot +=
                Path.DirectorySeparatorChar;
        }


        //=======================================================
        // Security Validation
        //=======================================================

        if
        (
            !physicalFilePath.StartsWith(
                normalizedWebRoot,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return string.Empty;
        }


        //=======================================================
        // Verify Physical File
        //=======================================================

        if
        (
            !System.IO.File.Exists(
                physicalFilePath
            )
        )
        {
            return string.Empty;
        }


        //=======================================================
        // Read Image Bytes
        //=======================================================

        byte[] fileBytes;

        try
        {
            fileBytes =
                System.IO.File.ReadAllBytes(
                    physicalFilePath
                );
        }
        catch
        {
            return string.Empty;
        }


        if
        (
            fileBytes.Length ==
            0
        )
        {
            return string.Empty;
        }


        //=======================================================
        // Resolve MIME Type
        //=======================================================

        FileExtensionContentTypeProvider
            contentTypeProvider =
                new FileExtensionContentTypeProvider();


        if
        (
            !contentTypeProvider.TryGetContentType(
                physicalFilePath,
                out string? contentType
            )
        )
        {
            contentType =
                "application/octet-stream";
        }


        //=======================================================
        // Build Base64
        //=======================================================

        string base64 =
            Convert.ToBase64String(
                fileBytes
            );


        //=======================================================
        // Return Browser-Ready Data URL
        //=======================================================

        return
            $"data:{contentType};base64,{base64}";
    }


    //===========================================================
    // Get User Profile Photo
    //===========================================================
    //
    // Returns the actual physical profile photo.
    //
    // This endpoint remains available for other application
    // functions that may require the physical image response.
    //
    // The Welcome Widget does NOT need this endpoint anymore.
    // It will use UserPhotoData from GetById().
    //
    //===========================================================

    [HttpGet("{id:long}/photo")]
    public async Task<IActionResult> GetPhoto(
        long id)
    {
        //=======================================================
        // Get User Profile
        //=======================================================

        UserProfileDto? profile =
            await _repository.GetByIdAsync(
                id);


        //=======================================================
        // Verify User Profile
        //=======================================================

        if
        (
            profile == null
        )
        {
            return NotFound(
                "User Profile not found.");
        }


        //=======================================================
        // Verify Photo Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                profile.UserPhotoPath)
        )
        {
            return NotFound(
                "User Profile does not have a photo.");
        }


        //=======================================================
        // Resolve Web Root
        //=======================================================

        string webRootPath =
            _environment.WebRootPath
            ??
            Path.Combine(
                _environment.ContentRootPath,
                "wwwroot"
            );


        //=======================================================
        // Normalize Relative Photo Path
        //=======================================================

        string relativePath =
            profile.UserPhotoPath
                .Trim()
                .TrimStart(
                    '/',
                    '\\'
                );


        //=======================================================
        // Resolve Physical Photo Path
        //=======================================================

        string physicalFilePath =
            Path.GetFullPath(
                Path.Combine(
                    webRootPath,
                    relativePath
                )
            );


        //=======================================================
        // Normalize Web Root
        //=======================================================

        string normalizedWebRoot =
            Path.GetFullPath(
                webRootPath
            );


        if
        (
            !normalizedWebRoot.EndsWith(
                Path.DirectorySeparatorChar
            )
        )
        {
            normalizedWebRoot +=
                Path.DirectorySeparatorChar;
        }


        //=======================================================
        // Security Validation
        //=======================================================

        if
        (
            !physicalFilePath.StartsWith(
                normalizedWebRoot,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return BadRequest(
                "Invalid profile photo path.");
        }


        //=======================================================
        // Verify Physical File
        //=======================================================

        if
        (
            !System.IO.File.Exists(
                physicalFilePath
            )
        )
        {
            return NotFound(
                "Profile photo file was not found.");
        }


        //=======================================================
        // Determine Content Type
        //=======================================================

        FileExtensionContentTypeProvider
            contentTypeProvider =
                new FileExtensionContentTypeProvider();


        if
        (
            !contentTypeProvider.TryGetContentType(
                physicalFilePath,
                out string? contentType
            )
        )
        {
            contentType =
                "application/octet-stream";
        }


        //=======================================================
        // Return Physical File
        //=======================================================

        return PhysicalFile(
            physicalFilePath,
            contentType);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<long>> Create(
        CreateUserProfileDto dto)
    {
        long userId =
            1;

        long id =
            await _repository.CreateAsync(
                dto,
                userId);

        return Ok(
            id);
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]
    public async Task<IActionResult> Update(
        UpdateUserProfileDto dto)
    {
        if
        (
            !await _repository.ExistsAsync(
                dto.UserProfileId)
        )
        {
            return NotFound();
        }


        //=======================================================
        // Current User
        //=======================================================

        long userId =
            1;


        //=======================================================
        // Update
        //=======================================================

        await _repository.UpdateAsync(
            dto,
            userId);


        return NoContent();
    }


    //===========================================================
    // Upload User Profile Photo
    //===========================================================

    [HttpPost("{id:long}/photo")]
    public async Task<IActionResult> UploadPhoto(
        long id,
        IFormFile file)
    {
        //=======================================================
        // Verify User Profile Exists
        //=======================================================

        if
        (
            !await _repository.ExistsAsync(
                id)
        )
        {
            return NotFound(
                "User Profile not found.");
        }


        //=======================================================
        // Validate File
        //=======================================================

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


        //=======================================================
        // Validate File Type
        //=======================================================

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


        //=======================================================
        // Validate File Size
        //=======================================================

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


        //=======================================================
        // Upload Directory
        //=======================================================

        string webRootPath =
            _environment.WebRootPath
            ??
            Path.Combine(
                _environment.ContentRootPath,
                "wwwroot"
            );


        string uploadDirectory =
            Path.Combine(
                webRootPath,
                "uploads",
                "user-photos"
            );


        //=======================================================
        // Ensure Upload Directory Exists
        //=======================================================

        Directory.CreateDirectory(
            uploadDirectory);


        //=======================================================
        // Get Existing User Profile
        //=======================================================

        UserProfileDto? existingProfile =
            await _repository.GetByIdAsync(
                id);


        if
        (
            existingProfile == null
        )
        {
            return NotFound(
                "User Profile not found.");
        }


        //=======================================================
        // Generate File Name
        //=======================================================

        string fileName =
            $"{Guid.NewGuid():N}{extension}";


        string physicalFilePath =
            Path.Combine(
                uploadDirectory,
                fileName);


        //=======================================================
        // Save File
        //=======================================================

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


        //=======================================================
        // Relative Photo Path
        //=======================================================

        string photoPath =
            $"/uploads/user-photos/{fileName}";


        //=======================================================
        // Current User
        //=======================================================

        long userId =
            1;


        //=======================================================
        // Save Photo Path To Database
        //=======================================================

        await _repository.UpdatePhotoAsync(
            id,
            photoPath,
            userId);


        //=======================================================
        // Delete Previous Physical Photo
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace(
                existingProfile.UserPhotoPath)
        )
        {
            DeletePhysicalPhoto(
                existingProfile.UserPhotoPath);
        }


        //=======================================================
        // Return Photo Path
        //=======================================================

        return Ok(
            photoPath);
    }


    //===========================================================
    // Delete User Profile Photo
    //===========================================================

    [HttpDelete("{id:long}/photo")]
    public async Task<IActionResult> DeletePhoto(
        long id)
    {
        //=======================================================
        // Verify User Profile Exists
        //=======================================================

        if
        (
            !await _repository.ExistsAsync(
                id)
        )
        {
            return NotFound(
                "User Profile not found.");
        }


        //=======================================================
        // Get Existing User Profile
        //=======================================================

        UserProfileDto? existingProfile =
            await _repository.GetByIdAsync(
                id);


        if
        (
            existingProfile == null
        )
        {
            return NotFound(
                "User Profile not found.");
        }


        //=======================================================
        // Current User
        //=======================================================

        long userId =
            1;


        //=======================================================
        // Clear Photo Path From Database
        //=======================================================

        await _repository.ClearPhotoAsync(
            id,
            userId);


        //=======================================================
        // Delete Physical Photo
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace(
                existingProfile.UserPhotoPath)
        )
        {
            DeletePhysicalPhoto(
                existingProfile.UserPhotoPath);
        }


        //=======================================================
        // Delete Successful
        //=======================================================

        return NoContent();
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id)
    {
        //=======================================================
        // Verify User Profile Exists
        //=======================================================

        if
        (
            !await _repository.ExistsAsync(
                id)
        )
        {
            return NotFound();
        }


        //=======================================================
        // Current User
        //=======================================================

        long userId =
            1;


        //=======================================================
        // Delete
        //=======================================================

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


        //=======================================================
        // Delete Successful
        //=======================================================

        return NoContent();
    }


    //===========================================================
    // Restore
    //===========================================================

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


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>>
        GetHistory()
    {
        return Ok(
            await _activityHistoryRepository
                .GetListHistoryAsync(
                    "Security Permission",
                    "User Profile"
                )
        );
    }


    //===========================================================
    // Delete Physical Photo
    //===========================================================

    private void DeletePhysicalPhoto(
        string photoPath)
    {
        try
        {
            //=======================================================
            // Validate Path
            //=======================================================

            if
            (
                string.IsNullOrWhiteSpace(
                    photoPath)
            )
            {
                return;
            }


            //=======================================================
            // Web Root Path
            //=======================================================

            string webRootPath =
                _environment.WebRootPath
                ??
                Path.Combine(
                    _environment.ContentRootPath,
                    "wwwroot"
                );


            //=======================================================
            // Normalize Relative Path
            //=======================================================

            string relativePath =
                photoPath
                    .Trim()
                    .TrimStart(
                        '/',
                        '\\'
                    );


            //=======================================================
            // Physical File Path
            //=======================================================

            string physicalFilePath =
                Path.GetFullPath(
                    Path.Combine(
                        webRootPath,
                        relativePath
                    )
                );


            //=======================================================
            // Normalize Web Root
            //=======================================================

            string normalizedWebRoot =
                Path.GetFullPath(
                    webRootPath
                );


            if
            (
                !normalizedWebRoot.EndsWith(
                    Path.DirectorySeparatorChar
                )
            )
            {
                normalizedWebRoot +=
                    Path.DirectorySeparatorChar;
            }


            //=======================================================
            // Security Validation
            //=======================================================

            if
            (
                !physicalFilePath.StartsWith(
                    normalizedWebRoot,
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return;
            }


            //=======================================================
            // Delete Physical File
            //=======================================================

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
            //
            // Database operation remains successful even if the
            // physical file cannot be removed.
            //
        }
    }
}