//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Platform.Authentication.DTOs;
using AppCore.Application.Platform.Authentication.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Platform.Authentication;


//===============================================================
// Branch Switch Controller (user menu › Switch Branch,
// 2026-11-07)
//
//   GET  api/platform/branch-switch/my-branches
//        the user's active branches (Branch Assignment, the login
//        rule) with wing + business lines, the current one marked,
//        CanSwitch / Message
//   POST api/platform/branch-switch   { branchId }
//        a new token for that branch, same expiry as the current
//        token (LoginResponseDto, as login answers)
//
// Logged-in users only (the app's fallback policy). Refusals :
// 400 with { success:false, message }.
//===============================================================

[ApiController]
[Route("api/platform/branch-switch")]
public class BranchSwitchController
    : ControllerBase
{
    private readonly IAuthenticationService _authenticationService;


    public BranchSwitchController
    (
        IAuthenticationService authenticationService
    )
    {
        _authenticationService = authenticationService;
    }


    // The session's end (the token's exp claim, unix seconds)
    private DateTime? TokenExpiresUtc()
    {
        string? value =
            User.FindFirst("exp")?.Value;

        return long.TryParse(value, out long seconds)
            ? DateTimeOffset.FromUnixTimeSeconds(seconds).UtcDateTime
            : null;
    }


    [HttpGet("my-branches")]
    public async Task<ActionResult<MyBranchesDto>> GetMyBranches()
    {
        try
        {
            return Ok(
                await _authenticationService.GetMyBranchesAsync(
                    this.CurrentUserId(),
                    this.CurrentBranchId() ?? 0));
        }
        catch (Exception ex)
        {
            // The reason shows in the pop-up (500 with { message })
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { success = false, message = $"Your branches could not be loaded : {ex.GetBaseException().Message}" });
        }
    }


    [HttpPost]
    public async Task<ActionResult<LoginResponseDto>> Switch(
        [FromBody] SwitchBranchRequestDto? request)
    {
        LoginResponseDto response;

        try
        {
            response =
                await _authenticationService.SwitchBranchAsync(
                    this.CurrentUserId(),
                    this.CurrentBranchId() ?? 0,
                    request ?? new SwitchBranchRequestDto(),
                    TokenExpiresUtc());
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new LoginResponseDto { Success = false, Message = $"The branch could not be switched : {ex.GetBaseException().Message}" });
        }

        return response.Success
            ? Ok(response)
            : BadRequest(response);
    }
}
