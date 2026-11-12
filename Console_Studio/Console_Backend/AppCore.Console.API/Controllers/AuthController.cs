//===============================================================
// Staff login : api/auth
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private const int MaxFailures = 5;
    private static readonly TimeSpan LockFor = TimeSpan.FromMinutes(15);

    private readonly ControlDbContext _db;
    private readonly StaffTokens _tokens;
    private readonly Audit _audit;

    public AuthController(ControlDbContext db, StaffTokens tokens, Audit audit)
    {
        _db = db;
        _tokens = tokens;
        _audit = audit;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        string loginId = (request.LoginId ?? string.Empty).Trim().ToLowerInvariant();

        StaffUser? user =
            await _db.StaffUsers.FirstOrDefaultAsync(x => x.LoginId.ToLower() == loginId);

        if (user is null || user.Status != "Active")
        {
            _audit.Add("Login.Failed", "StaffUser", loginId, details: "Unknown or inactive login");
            await _db.SaveChangesAsync();

            return Unauthorized(new { message = "Wrong login ID or password." });
        }

        if (user.LockedUntil is DateTime locked && locked > DateTime.UtcNow)
        {
            return Unauthorized(new { message = $"Locked after {MaxFailures} wrong passwords. Try again after {locked.ToLocalTime():HH:mm}." });
        }

        if (!StaffPassword.Verify(request.Password ?? string.Empty, user.PasswordHash))
        {
            user.FailedLogins++;

            if (user.FailedLogins >= MaxFailures)
            {
                user.LockedUntil = DateTime.UtcNow.Add(LockFor);
                user.FailedLogins = 0;
            }

            _audit.Add("Login.Failed", "StaffUser", user.StaffUserId.ToString(), staffUserId: user.StaffUserId);
            await _db.SaveChangesAsync();

            return Unauthorized(new { message = "Wrong login ID or password." });
        }

        StaffRole role = await _db.StaffRoles.FirstAsync(x => x.StaffRoleId == user.StaffRoleId);

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
