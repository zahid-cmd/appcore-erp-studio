//===============================================================
// Feedback Controller  (2026-11-09)
//
//   POST /api/platform/feedback             any signed-in user
//   GET  /api/platform/feedback/mine        the sender's own + replies
//   GET  /api/platform/feedback/me          am I a developer + new
//   GET  /api/platform/feedback             developers : the list
//   GET  /api/platform/feedback/{publicId}  developers : one
//   PUT  /api/platform/feedback/{publicId}  developers : status/note
//
// Developers = Developer role (DeveloperAccess). Everybody else
// gets "not found" for the developer calls. Login required
// (global fallback policy).
//
// The database is WIN1252 : characters it cannot hold (e.g.
// Bangla) are saved as "?".
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.CurrentUser;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Platform.Feedbacks;
using AppCore.Infrastructure.Persistence;

namespace AppCore.Api.Controllers.Platform;


public class SendFeedbackDto
{
    public string Kind { get; set; } = "Bug";

    public string Message { get; set; } = string.Empty;

    // data URL of the picture ('' = none)
    public string ScreenshotData { get; set; } = string.Empty;

    public string PageUrl { get; set; } = string.Empty;

    public string PageTitle { get; set; } = string.Empty;

    public string AppVersion { get; set; } = string.Empty;
}

public class UpdateFeedbackDto
{
    // New / In progress / Done
    public string Status { get; set; } = "New";

    public string DeveloperNote { get; set; } = string.Empty;

    // the sender sees this
    public string ReplyToUser { get; set; } = string.Empty;
}

// what the sender sees of his own feedback (no developer names,
// no private note)
public class MyFeedbackDto
{
    public Guid PublicId { get; set; }

    public long Number { get; set; }

    public string Kind { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string ScreenshotPath { get; set; } = string.Empty;

    public string PageTitle { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string ReplyToUser { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class FeedbackDto
{
    public Guid PublicId { get; set; }

    public long Number { get; set; }

    public string Kind { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string ScreenshotPath { get; set; } = string.Empty;

    public string PageUrl { get; set; } = string.Empty;

    public string PageTitle { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string AppVersion { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string DeveloperNote { get; set; } = string.Empty;

    public string ReplyToUser { get; set; } = string.Empty;

    public string HandledByName { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


[ApiController]
[Route("api/platform/feedback")]
public class FeedbackController : ControllerBase
{
    private static readonly string[] Kinds = { "Bug", "Idea", "Question", "Praise" };

    private static readonly string[] Statuses = { "New", "In progress", "Done" };

    private const int MaxPhotoBytes = 3 * 1024 * 1024;

    private readonly AppDbContext _context;

    private readonly ICurrentUserService _currentUser;

    private readonly IWebHostEnvironment _environment;

    public FeedbackController
    (
        AppDbContext context,
        ICurrentUserService currentUser,
        IWebHostEnvironment environment
    )
    {
        _context = context;
        _currentUser = currentUser;
        _environment = environment;
    }


    //===========================================================
    // Send (anyone signed in)
    //===========================================================

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] SendFeedbackDto dto)
    {
        string message =
            Clean(dto?.Message, 2000);

        if (message.Length < 3)
        {
            return BadRequest(new { message = "Write a few words first." });
        }

        string kind =
            Kinds.FirstOrDefault(x => string.Equals(x, dto!.Kind?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? "Bug";

        string screenshot =
            string.Empty;

        if (!string.IsNullOrWhiteSpace(dto!.ScreenshotData))
        {
            (string? path, string? error) =
                await SaveScreenshotAsync(dto.ScreenshotData);

            if (error is not null)
            {
                return BadRequest(new { message = error });
            }

            screenshot =
                path ?? string.Empty;
        }

        long? branchId =
            _currentUser.BranchId;

        string branch =
            branchId is null
                ? string.Empty
                : await _context
                    .Set<Branches>()
                    .AsNoTracking()
                    .Where(x => x.BranchId == branchId.Value)
                    .Select(x => x.BranchName)
                    .FirstOrDefaultAsync()
                  ?? string.Empty;

        var entry = new FeedbackEntry
        {
            Kind = kind,
            Message = message,
            ScreenshotPath = screenshot,
            PageUrl = Clean(dto.PageUrl, 400),
            PageTitle = Clean(dto.PageTitle, 200),
            BranchName = Clean(branch, 200),
            AppVersion = Clean(dto.AppVersion, 40),
            UserProfileId = _currentUser.UserId,
            UserName = Clean(_currentUser.PerformedByName, 200),
            Status = "New",
            CreatedDate = DateTime.UtcNow
        };

        _context.Set<FeedbackEntry>().Add(entry);

        await _context.SaveChangesAsync();

        return Ok(new { entry.PublicId });
    }


    //===========================================================
    // My feedback (the sender's own, with the replies)
    //===========================================================

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        if (!_currentUser.IsAuthenticated)
        {
            return Ok(Array.Empty<MyFeedbackDto>());
        }

        long me =
            _currentUser.UserId;

        var rows =
            await _context.Set<FeedbackEntry>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.UserProfileId == me)
                .OrderByDescending(x => x.CreatedDate)
                .Take(100)
                .Select(x => new MyFeedbackDto
                {
                    PublicId = x.PublicId,
                    Number = x.FeedbackId,
                    Kind = x.Kind,
                    Message = x.Message,
                    ScreenshotPath = x.ScreenshotPath,
                    PageTitle = x.PageTitle,
                    Status = x.Status,
                    ReplyToUser = x.ReplyToUser,
                    CreatedDate = x.CreatedDate,
                    ModifiedDate = x.ModifiedDate
                })
                .ToListAsync();

        return Ok(rows);
    }


    //===========================================================
    // Am I a developer ? (+ how many new)
    //===========================================================

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        bool developer =
            DeveloperAccess.ViewerIsDeveloper(_context, _currentUser);

        int newCount =
            developer
                ? await _context.Set<FeedbackEntry>()
                    .CountAsync(x => !x.IsDeleted && x.Status == "New")
                : 0;

        return Ok(new { isDeveloper = developer, newCount });
    }


    //===========================================================
    // Developers : list / one / status
    //===========================================================

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? kind, [FromQuery] string? search)
    {
        if (!DeveloperAccess.ViewerIsDeveloper(_context, _currentUser))
        {
            return NotFound();
        }

        IQueryable<FeedbackEntry> query =
            _context.Set<FeedbackEntry>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            query = query.Where(x => x.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(kind) && kind != "All")
        {
            query = query.Where(x => x.Kind == kind);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            string like =
                "%" + search.Trim().Replace("%", "").Replace("_", "") + "%";

            query = query.Where(x =>
                EF.Functions.ILike(x.Message, like)
                || EF.Functions.ILike(x.UserName, like)
                || EF.Functions.ILike(x.PageTitle, like)
                || EF.Functions.ILike(x.BranchName, like));
        }

        var rows =
            await query
                .OrderByDescending(x => x.CreatedDate)
                .Take(500)
                .ToListAsync();

        return Ok(rows.Select(ToDto).ToList());
    }

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> GetOne(Guid publicId)
    {
        if (!DeveloperAccess.ViewerIsDeveloper(_context, _currentUser))
        {
            return NotFound();
        }

        var row =
            await _context.Set<FeedbackEntry>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted);

        return row is null ? NotFound() : Ok(ToDto(row));
    }

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(Guid publicId, [FromBody] UpdateFeedbackDto dto)
    {
        if (!DeveloperAccess.ViewerIsDeveloper(_context, _currentUser))
        {
            return NotFound();
        }

        var row =
            await _context.Set<FeedbackEntry>()
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted);

        if (row is null)
        {
            return NotFound();
        }

        row.Status =
            Statuses.FirstOrDefault(x => string.Equals(x, dto?.Status?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? row.Status;

        row.DeveloperNote = Clean(dto?.DeveloperNote, 2000);
        row.ReplyToUser = Clean(dto?.ReplyToUser, 2000);
        row.HandledByName = Clean(_currentUser.PerformedByName, 200);
        row.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(row));
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static FeedbackDto ToDto(FeedbackEntry x) => new()
    {
        PublicId = x.PublicId,
        Number = x.FeedbackId,
        Kind = x.Kind,
        Message = x.Message,
        ScreenshotPath = x.ScreenshotPath,
        PageUrl = x.PageUrl,
        PageTitle = x.PageTitle,
        BranchName = x.BranchName,
        AppVersion = x.AppVersion,
        UserName = x.UserName,
        Status = x.Status,
        DeveloperNote = x.DeveloperNote,
        ReplyToUser = x.ReplyToUser,
        HandledByName = x.HandledByName,
        CreatedDate = x.CreatedDate,
        ModifiedDate = x.ModifiedDate
    };

    // trim, cut, and keep only what the WIN1252 database can hold
    private static string Clean(string? value, int max)
    {
        string text =
            new string((value ?? string.Empty)
                .Select(c => c == '\n' || c == '\t' || (c >= ' ' && c <= '~') || (c >= '\u00A0' && c <= '\u00FF') ? c : '?')
                .ToArray())
            .Trim();

        return text.Length > max ? text[..max] : text;
    }

    // wwwroot/uploads/feedback (copied to every PC by the
    // Uploads Mirror); JPG / PNG / WEBP by the file's own bytes
    private async Task<(string? Path, string? Error)> SaveScreenshotAsync(string data)
    {
        string base64 =
            data.Trim();

        int comma =
            base64.IndexOf(',');

        if (base64.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma > 0)
        {
            base64 = base64[(comma + 1)..];
        }

        if (base64.Length > (MaxPhotoBytes / 3 * 4) + 8)
        {
            return (null, "The screenshot is too large (max 3 MB).");
        }

        byte[] bytes;

        try
        {
            bytes = Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            return (null, "The screenshot could not be read. Attach it again.");
        }

        string? extension =
            bytes.Length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF
                ? ".jpg"
                : bytes.Length > 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                    ? ".png"
                    : bytes.Length > 12
                      && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                      && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50
                        ? ".webp"
                        : null;

        if (extension is null)
        {
            return (null, "Only JPG, PNG and WEBP pictures can be attached.");
        }

        string webRoot =
            _environment.WebRootPath
            ?? Path.Combine(_environment.ContentRootPath, "wwwroot");

        string folder =
            Path.Combine(webRoot, "uploads", "feedback");

        Directory.CreateDirectory(folder);

        string fileName =
            $"{Guid.NewGuid():N}{extension}";

        await System.IO.File.WriteAllBytesAsync(
            Path.Combine(folder, fileName),
            bytes);

        return ($"/uploads/feedback/{fileName}", null);
    }
}
