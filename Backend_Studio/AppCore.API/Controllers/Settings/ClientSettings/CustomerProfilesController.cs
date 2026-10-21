//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ClientSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ClientSettings;


//===============================================================
// Customer Profiles Controller
//
// Customer Photo
//   POST   {id}/photo   multipart field "file" (JPG / PNG by
//                       content; max 2 MB) -> saved to
//                       wwwroot/uploads/customer-photos/, path stored
//                       on the customer, old file removed. Returns
//                       the new path as plain text.
//   DELETE {id}/photo   removes the file and clears the path.
//===============================================================

[ApiController]

[Route("api/settings/client-settings/customer-profiles")]

public class CustomerProfilesController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private const string PhotoFolder =
        "customer-photos";

    private const long PhotoMaxBytes =
        2 * 1024 * 1024;

    private readonly ICustomerProfilesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IWebHostEnvironment _environment;

    private readonly ILogger<CustomerProfilesController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public CustomerProfilesController(
        ICustomerProfilesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IWebHostEnvironment environment,
        ILogger<CustomerProfilesController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _environment = environment;

        _logger = logger;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<CustomerProfilesDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<CustomerProfilesDefaultsDto>> GetDefaults()
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

    public async Task<ActionResult<CustomerProfilesDto>> GetById(
        long id)
    {
        CustomerProfilesDto? customer =
            await _repository.GetByIdAsync(id);

        if (customer == null)
        {
            return NotFound();
        }

        return Ok(customer);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateCustomerProfilesDto dto)
    {
        long userId = 1;

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            return Ok(id);
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
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateCustomerProfilesDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.CustomerId))
        {
            return NotFound();
        }

        long userId = 1;

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
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.DeleteAsync(
                id,
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
            //=======================================================
            // Deletion Blocked
            // HTTP 409 with a plain-text message for the toast.
            //=======================================================

            return Conflict(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        bool restored;

        try
        {
            restored =
                await _repository.RestoreAsync(
                    userId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            // Blocked : phone / NID taken, or its ledger sub group is gone
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted customers available to restore.");
        }

        return NoContent();
    }


    //===========================================================
    // Upload Customer Photo
    //===========================================================

    [HttpPost("{id:long}/photo")]

    [RequestSizeLimit(5 * 1024 * 1024)]

    public async Task<IActionResult> UploadPhoto(
        long id,
        IFormFile file)
    {
        long userId = 1;

        //=======================================================
        // Validate
        //=======================================================

        if (file == null || file.Length == 0)
        {
            return BadRequest("Customer Photo file is required.");
        }

        if (file.Length > PhotoMaxBytes)
        {
            return BadRequest("Customer Photo cannot be larger than 2 MB.");
        }

        //=======================================================
        // Detect the real type from the file's first bytes.
        // The name / extension is ignored : Windows often saves
        // JPEGs as .jfif, and names can be wrong or missing.
        //=======================================================

        string? extension =
            await DetectPhotoExtensionAsync(file);

        if (extension == null)
        {
            return BadRequest("Customer Photo must be a JPG or PNG file.");
        }

        CustomerProfilesDto? customer =
            await _repository.GetByIdAsync(id);

        if (customer == null)
        {
            return NotFound("Customer not found.");
        }


        try
        {
            //===================================================
            // Save File : <CustomerCode>-<timestamp>-<guid>.<ext>
            //===================================================

            string uploadDirectory =
                Path.Combine(
                    WebRoot(),
                    "uploads",
                    PhotoFolder);

            Directory.CreateDirectory(
                uploadDirectory);

            string safeCode =
                string.Concat(
                    (customer.CustomerCode ?? "CUSTOMER")
                        .Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'));

            string fileName =
                $"{safeCode}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}{extension}";

            await using
            (
                FileStream stream =
                    new FileStream(
                        Path.Combine(uploadDirectory, fileName),
                        FileMode.CreateNew,
                        FileAccess.Write,
                        FileShare.None)
            )
            {
                await file.CopyToAsync(stream);
            }


            //===================================================
            // Store Path, Remove Old File
            //===================================================

            string photoPath =
                $"/uploads/{PhotoFolder}/{fileName}";

            string oldPath =
                await _repository.SetPhotoPathAsync(
                    id,
                    photoPath,
                    userId);

            DeletePhotoFile(
                oldPath);

            return Content(
                photoPath,
                "text/plain");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Customer photo upload failed. Id {CustomerId}", id);

            return StatusCode(500, "Customer Photo could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Delete Customer Photo
    //===========================================================

    [HttpDelete("{id:long}/photo")]

    public async Task<IActionResult> DeletePhoto(
        long id)
    {
        long userId = 1;

        try
        {
            string oldPath =
                await _repository.SetPhotoPathAsync(
                    id,
                    string.Empty,
                    userId);

            DeletePhotoFile(
                oldPath);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Customer photo delete failed. Id {CustomerId}", id);

            return StatusCode(500, "Customer Photo could not be removed. Please try again.");
        }
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Client Settings",
                "Customer Profiles"));
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Reads the file header : JPEG / PNG → extension,
    // anything else → null.
    private static async Task<string?> DetectPhotoExtensionAsync(
        IFormFile file)
    {
        byte[] header =
            new byte[12];

        int read;

        await using (Stream stream = file.OpenReadStream())
        {
            read =
                await stream.ReadAsync(header.AsMemory(0, header.Length));
        }

        if (read >= 3
            && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return ".jpg";
        }

        if (read >= 8
            && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47
            && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
        {
            return ".png";
        }

        return null;
    }


    private string WebRoot()
    {
        return string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
    }


    // Removes a stored customer photo file (only inside its folder)
    private void DeletePhotoFile(
        string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return;
        }

        try
        {
            string folder =
                Path.GetFullPath(
                    Path.Combine(WebRoot(), "uploads", PhotoFolder));

            string fullPath =
                Path.GetFullPath(
                    Path.Combine(
                        WebRoot(),
                        relativePath.TrimStart('/', '\\')));

            if (fullPath.StartsWith(folder, StringComparison.OrdinalIgnoreCase)
                &&
                System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
            }
        }
        catch (Exception ex)
        {
            // A leftover file is harmless; never fail the request
            _logger.LogWarning(ex, "Could not remove old customer photo {Path}", relativePath);
        }
    }
}