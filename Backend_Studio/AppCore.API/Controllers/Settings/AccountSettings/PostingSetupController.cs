//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Api.Extensions;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.PostingSetup.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.AccountSettings;


//===============================================================
// Posting Setup Controller
//
//   GET  workspace            purposes + ledgers + CanChange
//   PUT  {purposeCode}        change one ledger (with a reason)
//   GET  history?purposeCode= changes, newest first
//
// Error mapping:
//   UnauthorizedAccessException → 403
//   KeyNotFoundException        → 404
//   InvalidOperationException   → 400
//   Anything else               → 500 (logged)
//===============================================================

[ApiController]

[Route("api/settings/account-settings/posting-setup")]

[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

public class PostingSetupController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IPostingSetupRepository _repository;

    private readonly ILogger<PostingSetupController> _logger;


    //===========================================================
    // Constructor
    //===========================================================

    public PostingSetupController(
        IPostingSetupRepository repository,
        ILogger<PostingSetupController> logger)
    {
        _repository = repository;

        _logger = logger;
    }


    //===========================================================
    // Workspace
    //===========================================================

    [HttpGet("workspace")]

    public async Task<ActionResult<PostingSetupWorkspaceDto>> GetWorkspace()
    {
        try
        {
            return Ok(
                await _repository.GetWorkspaceAsync(
                    this.CurrentUserId()));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the posting setup.");

            return StatusCode(500, $"Unable to load the posting setup. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // Update one purpose
    //===========================================================

    [HttpPut("{purposeCode}")]

    public async Task<ActionResult<PostingSetupRowDto>> Update(
        string purposeCode,
        [FromBody] UpdatePostingSetupDto dto)
    {
        try
        {
            return Ok(
                await _repository.UpdateAsync(
                    purposeCode,
                    dto,
                    this.CurrentUserId(),
                    this.CurrentUserName()));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ex.Message);
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
            _logger.LogError(ex, "Failed to update posting purpose {PurposeCode}.", purposeCode);

            return StatusCode(500, $"Unable to save the change. {ex.GetBaseException().Message}");
        }
    }


    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<PostingSetupHistoryDto>>> GetHistory(
        [FromQuery] string? purposeCode)
    {
        try
        {
            return Ok(
                await _repository.GetHistoryAsync(
                    purposeCode));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load the posting setup history.");

            return StatusCode(500, "Unable to load the history.");
        }
    }
}
