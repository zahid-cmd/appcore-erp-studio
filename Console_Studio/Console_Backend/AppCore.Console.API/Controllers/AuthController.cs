//===============================================================
// Staff login : api/auth
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


public record LoginRequest(string LoginId, string Password);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);


[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ControlDbContext _db;
    private readonly StaffTokens _tokens;
    private readonly Audit _audit;

    public AuthController(ControlDbContext db, StaffTokens tokens, Audit audit)
    {
        _db = db;
        _tokens = tokens;
        _audit = audit;
    }

    // Limits (2026-11-20, Security\LoginGuard.cs) : 10 tries / 5 min
    // per address, and 5 wrong passwords lock the login ID from
    // THAT address only, so a stranger cannot lock the Owner out.
    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting(LoginGuard.Policy)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        string loginId = (request.LoginId ?? string.Empty).Trim().ToLowerInvariant();

        // a made-up, very long login ID is not kept
        if (loginId.Length > 100)
        {
            return Unauthorized(new { message = "Wrong login ID or password." });
        }

        string address = VisitorIp.Of(HttpContext);

        // the same answer for a real and an unknown login ID
        if (LoginGuard.LockedUntil(loginId, address) is DateTime locked)
        {
            int minutes = Math.Max(1, (int)Math.Ceiling((locked - DateTime.UtcNow).TotalMinutes));

            return Unauthorized(new { message = $"Locked after {LoginGuard.MaxFailures} wrong passwords. Try again in {minutes} minute(s)." });
        }

        StaffUser? user =
            await _db.StaffUsers.FirstOrDefaultAsync(x => x.LoginId.ToLower() == loginId);

        if (user is null || user.Status != "Active")
        {
            LoginGuard.Failed(loginId, address);

            _audit.Add("Login.Failed", "StaffUser", loginId, details: "Unknown or inactive login");
            await _db.SaveChangesAsync();

            return Unauthorized(new { message = "Wrong login ID or password." });
        }

        if (!StaffPassword.Verify(request.Password ?? string.Empty, user.PasswordHash))
        {
            LoginGuard.Failed(loginId, address);

            // counted for information; the account itself is no
            // longer locked
            user.FailedLogins++;

            _audit.Add("Login.Failed", "StaffUser", user.StaffUserId.ToString(), staffUserId: user.StaffUserId);
            await _db.SaveChangesAsync();

            return Unauthorized(new { message = "Wrong login ID or password." });
        }

        StaffRole role = await _db.StaffRoles.FirstAsync(x => x.StaffRoleId == user.StaffRoleId);

        LoginGuard.Succeeded(loginId, address);

        user.FailedLogins = 0;
        user.LockedUntil = null;
        user.LastLoginDate = DateTime.UtcNow;

        _audit.Add("Login", "StaffUser", user.StaffUserId.ToString(), staffUserId: user.StaffUserId);
        await _db.SaveChangesAsync();

        (string token, DateTime expires) = _tokens.Create(user, role);

        return Ok(new
        {
            token,
            expiresUtc = expires,
            user = ToMe(user, role)
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        long? id = User.StaffId();

        StaffUser? user = await _db.StaffUsers.FirstOrDefaultAsync(x => x.StaffUserId == id);

        if (user is null || user.Status != "Active")
        {
            return Unauthorized();
        }

        StaffRole role = await _db.StaffRoles.FirstAsync(x => x.StaffRoleId == user.StaffRoleId);

        return Ok(ToMe(user, role));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        long? id = User.StaffId();

        StaffUser? user = await _db.StaffUsers.FirstOrDefaultAsync(x => x.StaffUserId == id);

        if (user is null)
        {
            return Unauthorized();
        }

        if (!StaffPassword.Verify(request.CurrentPassword ?? string.Empty, user.PasswordHash))
        {
            return BadRequest(new { message = "The current password is wrong." });
        }

        if (StaffPassword.Weakness(request.NewPassword) is string weak)
        {
            return BadRequest(new { message = weak });
        }

        if (request.NewPassword == request.CurrentPassword)
        {
            return BadRequest(new { message = "Choose a password different from the current one." });
        }

        user.PasswordHash = StaffPassword.Hash(request.NewPassword);
        user.MustChangePassword = false;
        user.ModifiedDate = DateTime.UtcNow;

        _audit.Add("Password.Changed", "StaffUser", user.StaffUserId.ToString());
        await _db.SaveChangesAsync();

        StaffRole role = await _db.StaffRoles.FirstAsync(x => x.StaffRoleId == user.StaffRoleId);

        (string token, DateTime expires) = _tokens.Create(user, role);

        return Ok(new { token, expiresUtc = expires, user = ToMe(user, role) });
    }

    private static object ToMe(StaffUser user, StaffRole role) => new
    {
        user.PublicId,
        user.LoginId,
        user.FullName,
        user.Email,
        RoleCode = role.RoleCode,
        RoleName = role.RoleName,
        user.MustChangePassword,
        user.LastLoginDate
    };
}
