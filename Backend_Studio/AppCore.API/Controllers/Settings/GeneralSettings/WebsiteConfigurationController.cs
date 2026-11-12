//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Api.Extensions;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.WebsiteConfiguration.DTOs;
using AppCore.Api.Platform.Tenancy;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.GeneralSettings;


//===============================================================
// Website Configuration Controller
// (Settings › General Settings › Website Configuration)
//
//   GET   ""        the configuration + every brand and branch
//   PUT   ""        saves everything (first save creates it)
//   POST  image     uploads a website photo → { path }
//   POST  map-pin   reads the pin from a Google Maps link
//   GET   history   changes, newest first
//
// Errors : InvalidOperationException → 400, else 500 (logged)
//===============================================================

[ApiController]

[Route("api/settings/general-settings/website-configuration")]

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

public class WebsiteConfigurationController : ControllerBase
{
    private const string ImageFolder = "website-images";

    private readonly IWebsiteConfigurationRepository _repository;

    private readonly IWebHostEnvironment _environment;

    private readonly ILogger<WebsiteConfigurationController> _logger;


    public WebsiteConfigurationController(
        IWebsiteConfigurationRepository repository,
        IWebHostEnvironment environment,
        ILogger<WebsiteConfigurationController> logger)
    {
        _repository = repository;

        _environment = environment;

        _logger = logger;
    }


    //===============================================================
    // Get
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<WebsiteConfigurationDto>> Get()
    {
        try
        {
            return Ok(await _repository.GetAsync());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the website configuration.");

            return StatusCode(500, $"Unable to load the website configuration. {ex.GetBaseException().Message}");
        }
    }


    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        [FromBody] WebsiteConfigurationDto dto)
    {
        if (dto is null)
        {
            return BadRequest("Nothing to save.");
        }

        try
        {
            await _repository.SaveAsync(
                dto,
                this.CurrentUserId(),
                this.CurrentUserName());

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save the website configuration.");

            return StatusCode(500, $"Unable to save the website configuration. {ex.GetBaseException().Message}");
        }
    }


    //===============================================================
    // Upload a website photo (Why us, service cards)
    // JPG / PNG / WEBP, at most 5 MB, checked by extension, type
    // and the file's first bytes.
    //===============================================================

    [HttpPost("image")]

    [RequestSizeLimit(5 * 1024 * 1024)]

    public async Task<ActionResult<object>> UploadImage(
        IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Choose a photo to upload.");
        }

        string extension =
            Path.GetExtension(file.FileName).ToLowerInvariant();

        string[] extensions = { ".jpg", ".jpeg", ".png", ".webp" };

        string[] types = { "image/jpeg", "image/png", "image/webp" };

        if (!extensions.Contains(extension) || !types.Contains((file.ContentType ?? string.Empty).ToLowerInvariant()))
        {
            return BadRequest("Only JPG, PNG and WEBP photos are allowed.");
        }

        byte[] head = new byte[12];

        await using (Stream probe = file.OpenReadStream())
        {
            _ = await probe.ReadAsync(head.AsMemory(0, head.Length));
        }

        bool isJpeg = head[0] == 0xFF && head[1] == 0xD8;
        bool isPng = head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47;
        bool isWebp = head[0] == 0x52 && head[1] == 0x49 && head[2] == 0x46 && head[3] == 0x46 && head[8] == 0x57 && head[9] == 0x45 && head[10] == 0x42 && head[11] == 0x50;

        if (!isJpeg && !isPng && !isWebp)
        {
            return BadRequest("The file is not a JPG, PNG or WEBP photo.");
        }

        string webRoot =
            string.IsNullOrWhiteSpace(TenantWebRoot.Of(HttpContext, _environment))
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : TenantWebRoot.Of(HttpContext, _environment);

        string folder =
            Path.Combine(webRoot, "uploads", ImageFolder);

        Directory.CreateDirectory(folder);

        string fileName =
            $"WEB-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}{extension}";

        await using
        (
            FileStream stream =
                new FileStream(
                    Path.Combine(folder, fileName),
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None)
        )
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new { path = $"/uploads/{ImageFolder}/{fileName}" });
    }


    //===============================================================
    // Google Maps link → pin (for the page's live preview)
    //===============================================================

    [HttpPost("map-pin")]

    public async Task<ActionResult<WebsiteMapPinDto>> MapPin(
        [FromBody] WebsiteMapPinDto request)
    {
        string link =
            (request?.Link ?? string.Empty).Trim();

        if (link.Length == 0 || link.Length > 1000)
        {
            return BadRequest("Paste a link copied from Google Maps.");
        }

        WebsiteMapPinDto? pin =
            await _repository.ResolveMapAsync(link);

        return pin is null
            ? BadRequest("This is not a Google Maps link, or it could not be read. In Google Maps open the place, press Share, then Copy link.")
            : Ok(pin);
    }


    //===============================================================
    // History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(await _repository.GetHistoryAsync());
    }
}
