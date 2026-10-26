//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.Company.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.GeneralSettings;


//===============================================================
// Company Controller
//===============================================================

[ApiController]

[Route("api/settings/general-settings/company")]

public class CompanyController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly ICompanyRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IWebHostEnvironment _environment;


    //===============================================================
    // Constructor
    //===============================================================

    public CompanyController(
        ICompanyRepository repository,
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

    [AllowAnonymous]
    [HttpGet]

    public async Task<ActionResult<List<CompanyDto>>> GetAll()
    {
        List<CompanyDto> companies =
            await _repository.GetAllAsync();

        return Ok(companies);
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

    public async Task<ActionResult<CompanyDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<CompanyDto>> GetById(
        long id)
    {
        CompanyDto? company =
            await _repository.GetByIdAsync(id);

        if (company == null)
        {
            return NotFound();
        }

        return Ok(company);
    }


    //===============================================================
    // Upload Company Logo
    //===============================================================

    [HttpPost("logo")]

    [RequestSizeLimit(5 * 1024 * 1024)]

    public async Task<ActionResult<object>> UploadLogo(
        IFormFile file,
        [FromForm] string companyCode)
    {
        //===========================================================
        // Validate File
        //===========================================================

        if (file == null || file.Length == 0)
        {
            return BadRequest(
                "Company logo file is required.");
        }


        //===========================================================
        // Validate Company Code
        //===========================================================

        if (string.IsNullOrWhiteSpace(companyCode))
        {
            return BadRequest(
                "Company Code is required.");
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
                "Invalid company logo image type.");
        }


        //===========================================================
        // Upload Directory
        //===========================================================

        string webRootPath =
            _environment.WebRootPath;


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
                "company-logos");


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
        // Clean Company Code
        //===========================================================

        string safeCompanyCode =
            string.Concat(
                companyCode
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
                safeCompanyCode))
        {
            return BadRequest(
                "Invalid Company Code.");
        }


        //===========================================================
        // Generate Unique File Name
        //===========================================================

        string uniqueFileName =
            $"{safeCompanyCode}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}{extension}";


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
            $"/uploads/company-logos/{uniqueFileName}";


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

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateCompanyDto dto)
    {
           long userId = this.CurrentUserId();

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
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
    }


    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateCompanyDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.CompanyId))
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

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        //===========================================================
        // Verify Company Exists
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
            // under this Company. Returned as HTTP 409 with a
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
                "General Settings",
                "Company"));
    }
}