//===============================================================
// Namespaces
//===============================================================

using System.IO.Compression;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Api.Platform.Tenancy;
using AppCore.Api.Security;
using AppCore.Application.Platform.BrandPacks;
using AppCore.Application.Platform.DataManagement;
using AppCore.Application.Settings.ProductSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.BrandPacks;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Platform.BrandPacks;

//===============================================================
// Brand Packs (2026-11-20)
//
// AppCore's own tool (developer or AppCore Admin only; no menu
// entry, the page is opened by its address).
//
//   GET  brands            : brands of this database (export list)
//   GET  export?brand=NAME : <brand>.acbrand (zip : pack.json +
//                            images/...)
//   POST install (file)    : installs a pack into this database,
//                            returns the report
//
// A pack carries the brand's catalogue : brand, its categories,
// colours, models with their colour bikes and pictures, model
// specifications, warranty parts / policies / coverages and PDI
// templates. No prices, no stock, no supplier, no service data.
//===============================================================

[ApiController]
[Route("api/platform/brand-packs")]
public class BrandPacksController : ControllerBase
{
    private const long MaxPackBytes = 300L * 1024 * 1024;
    private const long MaxImageBytes = 15L * 1024 * 1024;

    private static readonly JsonSerializerOptions Json = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    private readonly AppDbContext _context;
    private readonly IDataManagementService _data;
    private readonly IWebHostEnvironment _environment;
    private readonly BrandPackService _service;

    public BrandPacksController
    (
        AppDbContext context,
        IDataManagementService data,
        IWebHostEnvironment environment,
        IBrandManagementRepository brands,
        IProductCategoryRepository categories,
        IColorManagementRepository colours,
        IBikeModelsRepository models,
        IProductSubCategoryRepository subCategories,
        IMotorBikesRepository bikes,
        IMotorBikeSpecificationsRepository specifications,
        IModelOnboardingService onboarding
    )
    {
        _context = context;
        _data = data;
        _environment = environment;
        _service = new BrandPackService(context, brands, categories, colours, models, subCategories, bikes, specifications, onboarding);
    }


    //===========================================================
    // Access : developer or AppCore Admin
    //===========================================================

    private async Task<bool> MayAsync()
    {
        long userId = this.CurrentUserId();

        return userId > 0
            && (await _data.IsAppCoreAdminAsync(userId)
                || await DeveloperAccess.IsDeveloperAsync(_context, userId));
    }

    private ObjectResult Refused() =>
        StatusCode(StatusCodes.Status403Forbidden, new { message = "Brand Packs is for AppCore only (developer or AppCore Admin)." });

    private string WebRoot()
    {
        string root = TenantWebRoot.Of(HttpContext, _environment);
        return string.IsNullOrWhiteSpace(root) ? Path.Combine(_environment.ContentRootPath, "wwwroot") : root;
    }


    //===========================================================
    // Brands
    //===========================================================

    [HttpGet("brands")]
    public async Task<IActionResult> Brands()
    {
        if (!await MayAsync()) { return Refused(); }

        var list = await _service.BrandsAsync();

        return Ok(list.Select(b => new { name = b.Name, models = b.Models, bikes = b.Bikes }));
    }


    //===========================================================
    // Export
    //===========================================================

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string brand)
    {
        if (!await MayAsync()) { return Refused(); }

        if (string.IsNullOrWhiteSpace(brand))
        {
            return BadRequest(new { message = "Choose a brand." });
        }

        try
        {
            string source = $"{Request.Host.Host} / {_context.Database.GetDbConnection().Database}";

            (BrandPack pack, Dictionary<string, string> images) = await _service.ExportAsync(brand, source);

            string root = Path.GetFullPath(WebRoot());
            List<string> missing = new();

            using MemoryStream buffer = new();

            using (ZipArchive zip = new(buffer, ZipArchiveMode.Create, true))
            {
                foreach ((string packFile, string webPath) in images)
                {
                    string full = Path.GetFullPath(Path.Combine(root, webPath.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar)));

                    if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(full))
                    {
                        missing.Add(webPath);
                        continue;
                    }

                    zip.CreateEntryFromFile(full, packFile, CompressionLevel.NoCompression);
                }

                // pictures not found are left out of the pack
                if (missing.Count > 0)
                {
                    HashSet<string> gone = images
                        .Where(i => missing.Contains(i.Value))
                        .Select(i => i.Key)
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);

                    if (gone.Contains(pack.Brand.Image)) { pack.Brand.Image = string.Empty; }

                    foreach (BrandPackBike b in pack.Models.SelectMany(m => m.Bikes))
                    {
                        if (gone.Contains(b.Image)) { b.Image = string.Empty; }
                    }
                }

                ZipArchiveEntry entry = zip.CreateEntry("pack.json", CompressionLevel.Optimal);

                await using Stream stream = entry.Open();
                await JsonSerializer.SerializeAsync(stream, pack, Json);
            }

            string safe = string.Concat(pack.Brand.Name.Where(char.IsLetterOrDigit));
            string fileName = $"{(safe.Length == 0 ? "brand" : safe)}-{DateTime.UtcNow:yyyyMMdd-HHmm}.acbrand";

            Response.Headers["X-Pack-Missing-Images"] = missing.Count.ToString();
            Response.Headers["Access-Control-Expose-Headers"] = "Content-Disposition, X-Pack-Missing-Images";

            return File(buffer.ToArray(), "application/zip", fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }


    //===========================================================
    // Install
    //===========================================================

    [HttpPost("install")]
    [RequestSizeLimit(MaxPackBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxPackBytes)]
    public async Task<IActionResult> Install(IFormFile file)
    {
        if (!await MayAsync()) { return Refused(); }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Choose a brand pack file (.acbrand)." });
        }

        await using MemoryStream buffer = new();
        await file.CopyToAsync(buffer);
        buffer.Position = 0;

        ZipArchive zip;

        try
        {
            zip = new ZipArchive(buffer, ZipArchiveMode.Read, true);
        }
        catch (InvalidDataException)
        {
            return BadRequest(new { message = "This file is not a brand pack." });
        }

        using (zip)
        {
            ZipArchiveEntry? packEntry = zip.GetEntry("pack.json");

            if (packEntry == null)
            {
                return BadRequest(new { message = "This file is not a brand pack (pack.json missing)." });
            }

            BrandPack? pack;

            try
            {
                await using Stream stream = packEntry.Open();
                pack = await JsonSerializer.DeserializeAsync<BrandPack>(stream, Json);
            }
            catch (JsonException)
            {
                return BadRequest(new { message = "The pack's pack.json cannot be read." });
            }

            if (pack == null)
            {
                return BadRequest(new { message = "The pack is empty." });
            }

            string root = WebRoot();

            // reads one picture from the zip, checks it really is
            // a picture, saves it under uploads/<folder>/ with a
            // new name; returns its web path ('' = not saved)
            async Task<string> SaveImage(string packFile, string folder)
            {
                ZipArchiveEntry? entry = zip.GetEntry(packFile);

                if (entry == null || entry.Length == 0 || entry.Length > MaxImageBytes)
                {
                    return string.Empty;
                }

                byte[] bytes;

                await using (Stream s = entry.Open())
                await using (MemoryStream m = new())
                {
                    await s.CopyToAsync(m);
                    bytes = m.ToArray();
                }

                string? extension = ImageExtension(bytes);

                if (extension == null)
                {
                    return string.Empty;
                }

                string directory = Path.Combine(root, "uploads", folder);
                Directory.CreateDirectory(directory);

                string name = $"pack-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}{extension}";

                await System.IO.File.WriteAllBytesAsync(Path.Combine(directory, name), bytes);

                return $"/uploads/{folder}/{name}";
            }

            BrandPackReport report = await _service.InstallAsync(pack, SaveImage, this.CurrentUserId());

            return Ok(report);
        }
    }

    private static string? ImageExtension(byte[] h)
    {
        if (h.Length >= 3 && h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) { return ".jpg"; }
        if (h.Length >= 8 && h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47) { return ".png"; }
        if (h.Length >= 6 && h[0] == 0x47 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x38) { return ".gif"; }
        if (h.Length >= 12 && h[0] == 0x52 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x46
            && h[8] == 0x57 && h[9] == 0x45 && h[10] == 0x42 && h[11] == 0x50) { return ".webp"; }
        return null;
    }
}
