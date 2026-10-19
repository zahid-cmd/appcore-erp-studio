//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Settings.ProductSettings;


//===============================================================
// Spare Parts Controller
//
// Defaults
//   GET    defaults?productSubCategoryId=n   preview of the four codes
//
// Spare Part Image
//   POST   {id}/image   multipart field "file" (JPG/PNG/WEBP/GIF by
//                       content, any file name;
//                       max 2 MB) → saved to
//                       wwwroot/uploads/spare-part-images/, path
//                       stored on the part, old file removed. Returns
//                       the new path as plain text.
//   DELETE {id}/image   removes the file and clears the path.
//===============================================================

[ApiController]

[Route("api/settings/product-settings/spare-parts")]

public class SparePartsController : ControllerBase
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ImageFolder =
        "spare-part-images";

    private const long ImageMaxBytes =
        2 * 1024 * 1024;



    //===========================================================
    // Fields
    //===========================================================

    private readonly ISparePartsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IWebHostEnvironment _environment;

    private readonly ILogger<SparePartsController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public SparePartsController(
        ISparePartsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IWebHostEnvironment environment,
        ILogger<SparePartsController> logger)
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

    public async Task<ActionResult<List<SparePartsDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<SparePartsDefaultsDto>> GetDefaults(
        [FromQuery] long productSubCategoryId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    productSubCategoryId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<SparePartsDto>> GetById(
        long id)
    {
        SparePartsDto? sparePart =
            await _repository.GetByIdAsync(id);

        if (sparePart == null)
        {
            return NotFound();
        }

        return Ok(sparePart);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateSparePartsDto dto)
    {
        long userId = 1;

        try
        {
            return Ok(
                await _repository.CreateAsync(
                    dto,
                    userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Spare Part create failed.");

            return StatusCode(500, "Spare Part could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateSparePartsDto dto)
    {
        long userId = 1;

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Spare Part update failed. Id {SparePartId}", dto.SparePartId);

            return StatusCode(500, "Spare Part could not be updated. Please try again.");
        }
    }


    //===========================================================
    // Upload Spare Part Image
    //===========================================================

    [HttpPost("{id:long}/image")]

    [RequestSizeLimit(5 * 1024 * 1024)]

    public async Task<IActionResult> UploadImage(
        long id,
        IFormFile file)
    {
        long userId = 1;

        //=======================================================
        // Validate
        //=======================================================

        if (file == null || file.Length == 0)
        {
            return BadRequest("Spare Part Image file is required.");
        }

        if (file.Length > ImageMaxBytes)
        {
            return BadRequest("Spare Part Image cannot be larger than 2 MB.");
        }

        //=======================================================
        // Detect the real type from the file's first bytes.
        // The name / extension is ignored : Windows often saves
        // JPEGs as .jfif, and names can be wrong or missing.
        //=======================================================

        string? extension =
            await DetectImageExtensionAsync(file);

        if (extension == null)
        {
            return BadRequest("Spare Part Image must be a JPG, PNG, WEBP or GIF file.");
        }

        SparePartsDto? sparePart =
            await _repository.GetByIdAsync(id);

        if (sparePart == null)
        {
            return NotFound("Spare Part not found.");
        }


        try
        {
            //===================================================
            // Save File : <ProductCode>-<timestamp>-<guid>.<ext>
            //===================================================

            string uploadDirectory =
                Path.Combine(
                    WebRoot(),
                    "uploads",
                    ImageFolder);

            Directory.CreateDirectory(
                uploadDirectory);

            string safeCode =
                string.Concat(
                    (sparePart.ProductCode ?? "SPAREPART")
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

            string imagePath =
                $"/uploads/{ImageFolder}/{fileName}";

            string oldPath =
                await _repository.SetImagePathAsync(
                    id,
                    imagePath,
                    userId);

            DeleteImageFile(
                oldPath);

            return Content(
                imagePath,
                "text/plain");
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Spare Part image upload failed. Id {SparePartId}", id);

            return StatusCode(500, "Spare Part Image could not be saved. Please try again.");
        }
    }


    //===========================================================
    // Delete Spare Part Image
    //===========================================================

    [HttpDelete("{id:long}/image")]

    public async Task<IActionResult> DeleteImage(
        long id)
    {
        long userId = 1;

        try
        {
            string oldPath =
                await _repository.SetImagePathAsync(
                    id,
                    string.Empty,
                    userId);

            DeleteImageFile(
                oldPath);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Spare Part image delete failed. Id {SparePartId}", id);

            return StatusCode(500, "Spare Part Image could not be removed. Please try again.");
        }
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        long userId = 1;

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no deleted spare parts available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
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
                "Product Settings",
                "SpareParts"));
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Reads the file header : JPEG / PNG / GIF / WEBP → extension,
    // anything else → null.
    private static async Task<string?> DetectImageExtensionAsync(
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

        if (read >= 6
            && header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38)
        {
            return ".gif";
        }

        if (read >= 12
            && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
            && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
        {
            return ".webp";
        }

        return null;
    }


    private string WebRoot()
    {
        return string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
    }


    // Removes a stored spare part image file (only inside its folder)
    private void DeleteImageFile(
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
                    Path.Combine(WebRoot(), "uploads", ImageFolder));

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
            _logger.LogWarning(ex, "Could not remove old spare part image {Path}", relativePath);
        }
    }
}