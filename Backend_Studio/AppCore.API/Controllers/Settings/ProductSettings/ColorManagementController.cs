// PAGE-CLONED : Company -> Color Management
//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.Paging;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ColorManagement.DTOs;
using AppCore.Api.Platform.Tenancy;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ProductSettings;


//===============================================================
// ColorManagement Controller
//===============================================================

[ApiController]

[Route("api/settings/product-settings/color-management")]

public class ColorManagementController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly IColorManagementRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IWebHostEnvironment _environment;


    //===============================================================
    // Constructor
    //===============================================================

    public ColorManagementController(
        IColorManagementRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IWebHostEnvironment environment)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _environment = environment;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<ColorManagementDto>>> GetAll()
    {
        List<ColorManagementDto> companies =
            await _repository.GetAllAsync();

        return Ok(companies);
    }


    //===========================================================
    // Get Paged (the list page)
    //===========================================================

    [HttpGet("paged")]
    public async Task<ActionResult<PagedResult<ColorManagementDto>>> GetPaged(
        [FromQuery] ColorManagementPageRequest request)
    {
        return Ok(
            await _repository.GetPagedAsync(
                request ?? new ColorManagementPageRequest()));
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

    public async Task<ActionResult<ColorManagementDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<ColorManagementDto>> GetById(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        ColorManagementDto? colorManagement =
            await _repository.GetByIdAsync(id);

        if (colorManagement == null)
        {
            return NotFound();
        }

        return Ok(colorManagement);
    }


    //===============================================================
    // Upload ColorManagement Logo
    //===============================================================

    [HttpPost("logo")]

    [RequestSizeLimit(5 * 1024 * 1024)]

    public async Task<ActionResult<object>> UploadLogo(
        IFormFile file,
        [FromForm] string colorManagementCode)
    {
        //===========================================================
        // Validate File
        //===========================================================

        if (file == null || file.Length == 0)
        {
            return BadRequest(
                "ColorManagement logo file is required.");
        }


        //===========================================================
        // Validate ColorManagement Code
        //===========================================================

        if (string.IsNullOrWhiteSpace(colorManagementCode))
        {
            return BadRequest(
                "ColorManagement Code is required.");
        }


        //===========================================================
        // Allowed Extensions
        //===========================================================

        string extension =
            Path.GetExtension(
                file.FileName)
            .ToLowerInvariant();


        string[] allowedExtensions =
        [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        ];


        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(
                "Only JPG, JPEG, PNG and WEBP image files are allowed.");
        }


        //===========================================================
        // Allowed Content Types
        //===========================================================

        string[] allowedContentTypes =
        [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        if (!allowedContentTypes.Contains(
                file.ContentType.ToLowerInvariant()))
        {
            return BadRequest(
                "Invalid colorManagement logo image type.");
        }


        //===========================================================
        // Upload Directory
        //===========================================================

        string webRootPath =
            TenantWebRoot.Of(HttpContext, _environment);


        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath =
                Path.Combine(
                    _environment.ContentRootPath,
                    "wwwroot");
        }


        string uploadDirectory =
            Path.Combine(
                webRootPath,
                "uploads",
                "color-management-logos");


        //===========================================================
        // Create Upload Directory
        //===========================================================

        if (!Directory.Exists(
                uploadDirectory))
        {
            Directory.CreateDirectory(
                uploadDirectory);
        }


        //===========================================================
        // Clean ColorManagement Code
        //===========================================================

        string safeColorManagementCode =
            string.Concat(
                colorManagementCode
                    .Trim()
                    .Where(
                        character =>
                            char.IsLetterOrDigit(
                                character)
                            ||
                            character == '-'
                            ||
                            character == '_'
                    )
            );


        if (string.IsNullOrWhiteSpace(
                safeColorManagementCode))
        {
            return BadRequest(
                "Invalid ColorManagement Code.");
        }


        //===========================================================
        // Generate Unique File Name
        //===========================================================

        string uniqueFileName =
            $"{safeColorManagementCode}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}{extension}";


        string physicalFilePath =
            Path.Combine(
                uploadDirectory,
                uniqueFileName);


        //===========================================================
        // Save File
        //===========================================================

        await using
        (
            FileStream stream =
                new FileStream(
                    physicalFilePath,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None)
        )
        {
            await file.CopyToAsync(
                stream);
        }


        //===========================================================
        // Relative Logo Path
        //===========================================================

        string logoPath =
            $"/uploads/color-management-logos/{uniqueFileName}";


        //===========================================================
        // Return Logo Path
        //===========================================================

        return Ok(
            new
            {
                path = logoPath
            });
    }


    //===============================================================
    // Create
    //===============================================================

    // Returns the new row's Public Id
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(
        CreateColorManagementDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            ColorManagementDto? created =
                await _repository.GetByIdAsync(id);

            return Ok(created?.PublicId ?? Guid.Empty);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
    }


    //===============================================================
    // Update
    //===============================================================

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateColorManagementDto dto)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        dto.ColorManagementId =
            id;

        if (!await _repository.ExistsAsync(
                dto.ColorManagementId))
        {
            return NotFound();
        }

           long userId = this.CurrentUserId();

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


    //===============================================================
    // Delete
    //===============================================================

    [HttpDelete("{publicId:guid}")]

    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        //===========================================================
        // Verify ColorManagement Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }


        //===========================================================
        // Current User
        //===========================================================

           long userId = this.CurrentUserId();


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
            //
            // Raised by the repository when Wings still exist
            // under this ColorManagement. Returned as HTTP 409 with a
            // plain-text message for the "Delete Blocked" toast.
            //=======================================================

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
           long userId = this.CurrentUserId();

        bool restored =
            await _repository.RestoreAsync(
                userId);

        if (!restored)
        {
            return NotFound(
                "There are no deleted companies available to restore.");
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
                "Product Settings",
                "ColorManagement"));
    }
}