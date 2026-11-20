//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Api.Security;
using AppCore.Application.Platform.DataManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Platform.Tenancy;
using AppCore.Domain.Entities.SecurityPermission.RoleManagement;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Platform.Authentication;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Tenancy;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.SecurityPermission.UserManagement;


//===============================================================
// Access Requests (2026-11-20)
//
// Security & Permission > User Management > Access Requests
//
// "Register Now" on the sign-in page stores a request (no user).
// Here the administrator :
//   approves it : the user is made then, active, with the
//                 password the person chose, the role and the
//                 branches picked in the dialog;
//   rejects it  : no user is made; the request is kept 30 days.
//
//   GET  ?status=Pending|Approved|Rejected|All   list (View)
//   GET  options                                 roles, branches
//   POST {publicId}/approve  { RoleProfileId, BranchIds }  (Update)
//   POST {publicId}/reject   { Reason }                    (Update)
//
// Developer roles are never offered or accepted.
//===============================================================

[ApiController]
[Route("api/security-permission/user-management/access-requests")]
public class AccessRequestsController : ControllerBase
{
    private const string PageRoute = "/security-permission/%/access-requests";

    private const int KeepRejectedDays = 30;

    private readonly AppDbContext _context;
    private readonly IEffectiveAccessRepository _access;
    private readonly IDataManagementService _data;
    private readonly ITenantLimits _limits;

    public AccessRequestsController
    (
        AppDbContext context,
        IEffectiveAccessRepository access,
        IDataManagementService data,
        ITenantLimits limits
    )
    {
        _context = context;
        _access = access;
        _data = data;
        _limits = limits;
    }


    //===========================================================
    // DTOs
    //===========================================================

    public sealed class ApproveDto
    {
        public long RoleProfileId { get; set; }
        public List<long> BranchIds { get; set; } = new();
    }

    public sealed class RejectDto
    {
        public string Reason { get; set; } = string.Empty;
    }


    //===========================================================
    // Access
    //===========================================================

    private async Task<bool> MayAsync(string activity)
    {
        long userId = this.CurrentUserId();

        return await _data.IsAppCoreAdminAsync(userId)
            || await _access.HasActivityAsync(userId, PageRoute, activity);
    }

    private async Task<string> CurrentUserNameAsync()
    {
        long userId = this.CurrentUserId();

        var me = await _context.Set<UserProfile>()
            .AsNoTracking()
            .Where(x => x.UserProfileId == userId)
            .Select(x => new { x.DisplayName, x.FullName, x.UserName })
            .FirstOrDefaultAsync();

        if (me == null)
        {
            return string.Empty;
        }

        return !string.IsNullOrWhiteSpace(me.DisplayName) ? me.DisplayName
             : !string.IsNullOrWhiteSpace(me.FullName) ? me.FullName
             : me.UserName;
    }


    //===========================================================
    // List
    //===========================================================

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        if (!await MayAsync("View"))
        {
            return StatusCode(403, new { message = "You cannot open Access Requests." });
        }

        // rejected requests are kept 30 days, then removed
        DateTime purgeBefore = DateTime.UtcNow.AddDays(-KeepRejectedDays);

        await _context.Set<AccessRequest>()
            .Where(x => x.Status == AccessRequest.Rejected && x.DecidedDate != null && x.DecidedDate < purgeBefore)
            .ExecuteDeleteAsync();

        string wanted = (status ?? AccessRequest.Pending).Trim();

        IQueryable<AccessRequest> query = _context.Set<AccessRequest>().AsNoTracking();

        if (!string.Equals(wanted, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Status == wanted);
        }

        var items = await query
            .OrderByDescending(x => x.RequestedDate)
            .Take(500)
            .Select(x => new
            {
                x.PublicId,
                x.UserName,
                x.DisplayName,
                x.FullName,
                x.Email,
                x.MobileNo,
                x.UserPhotoPath,
                x.Status,
                x.RequestedDate,
                x.DecidedByName,
                x.DecidedDate,
                x.DecisionNote
            })
            .ToListAsync();

        var counts = await _context.Set<AccessRequest>()
            .AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int CountOf(string s) => counts.Where(c => c.Status == s).Sum(c => c.Count);

        return Ok(new
        {
            CanDecide = await MayAsync("Update"),
            Pending = CountOf(AccessRequest.Pending),
            Approved = CountOf(AccessRequest.Approved),
            Rejected = CountOf(AccessRequest.Rejected),
            Items = items
        });
    }


    //===========================================================
    // Options : roles (no developer roles) and branches
    //===========================================================

    [HttpGet("options")]
    public async Task<IActionResult> Options()
    {
        if (!await MayAsync("View"))
        {
            return StatusCode(403, new { message = "You cannot open Access Requests." });
        }

        var roles = await _context.Set<RoleProfile>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive && !x.IsDeveloperRole)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.ProfileName)
            .Select(x => new { Id = x.RoleProfileId, Code = x.ProfileCode, Name = x.ProfileName })
            .ToListAsync();

        var branches = await _context.Set<Branches>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.BranchCode)
            .Select(x => new { Id = x.BranchId, Code = x.BranchCode, Name = x.BranchName })
            .ToListAsync();

        return Ok(new { Roles = roles, Branches = branches });
    }


    //===========================================================
    // Approve : the user is made now
    //===========================================================

    [HttpPost("{publicId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid publicId, [FromBody] ApproveDto dto)
    {
        if (!await MayAsync("Update"))
        {
            return StatusCode(403, new { message = "Approving a request needs Update on Access Requests." });
        }

        AccessRequest? request = await _context.Set<AccessRequest>()
            .FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (request == null)
        {
            return NotFound(new { message = "This request no longer exists." });
        }

        if (request.Status != AccessRequest.Pending)
        {
            return Conflict(new { message = $"This request was already {request.Status.ToLower()}." });
        }

        RoleProfile? role = await _context.Set<RoleProfile>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.RoleProfileId == dto.RoleProfileId && !x.IsDeleted && x.IsActive);

        if (role == null || role.IsDeveloperRole)
        {
            return BadRequest(new { message = "Choose a role." });
        }

        List<long> branchIds = (dto.BranchIds ?? new()).Distinct().ToList();

        if (branchIds.Count == 0)
        {
            return BadRequest(new { message = "Choose at least one branch." });
        }

        int found = await _context.Set<Branches>()
            .AsNoTracking()
            .CountAsync(x => branchIds.Contains(x.BranchId) && !x.IsDeleted && x.IsActive);

        if (found != branchIds.Count)
        {
            return BadRequest(new { message = "One of the branches no longer exists. Refresh and try again." });
        }

        string name = request.UserName.Trim().ToLower();

        if (await _context.Set<UserProfile>().AnyAsync(x => !x.IsDeleted && x.UserName.ToLower() == name))
        {
            return Conflict(new { message = $"The Login ID '{request.UserName}' is already in use. Reject this request and ask for a new one." });
        }

        // user limit (Console MaxUsers, 2026-11-20)
        string? overLimit = await UserLimit.RefusalAsync(_context, _limits);

        if (overLimit != null)
        {
            return BadRequest(new { message = overLimit });
        }

        long adminId = this.CurrentUserId();
        string adminName = await CurrentUserNameAsync();
        DateTime now = DateTime.UtcNow;

        try
        {
            await using var tx = await _context.Database.BeginTransactionAsync();

            // CreatedBy 0 (made by Register) + saved by the
            // administrator : the new user's bell shows "your
            // account was approved" (ShellRepository)
            UserProfile user = new UserProfile
            {
                PublicId = Guid.CreateVersion7(),
                ProfileCode = await DeveloperAccess.NextCodeAsync(_context, false),
                UserName = request.UserName.Trim(),
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName)
                    ? (string.IsNullOrWhiteSpace(request.FullName) ? request.UserName.Trim() : request.FullName)
                    : request.DisplayName,
                FullName = request.FullName,
                Email = request.Email,
                MobileNo = request.MobileNo,
                UserPhotoPath = request.UserPhotoPath,
                IsActive = true,
                IsDeleted = false,
                CreatedBy = 0,
                CreatedDate = now,
                ModifiedBy = adminId,
                ModifiedDate = now
            };

            _context.Set<UserProfile>().Add(user);

            await _context.SaveChangesAsync();

            _context.Set<UserCredential>().Add(new UserCredential
            {
                UserProfileId = user.UserProfileId,
                PasswordHash = request.PasswordHash,
                PasswordChangedDate = now,
                CreatedDate = now
            });

            _context.Set<RoleAssignment>().Add(new RoleAssignment
            {
                PublicId = Guid.CreateVersion7(),
                UserProfileId = user.UserProfileId,
                IsActive = true,
                IsDeleted = false,
                CreatedBy = adminId,
                CreatedDate = now,
                Details = new List<RoleAssignmentDetail>
                {
                    new RoleAssignmentDetail
                    {
                        RoleProfileId = role.RoleProfileId,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedBy = adminId,
                        CreatedDate = now
                    }
                }
            });

            _context.Set<BranchAssignment>().Add(new BranchAssignment
            {
                PublicId = Guid.CreateVersion7(),
                UserProfileId = user.UserProfileId,
                IsActive = true,
                IsDeleted = false,
                CreatedBy = adminId,
                CreatedDate = now,
                Details = branchIds
                    .Select(id => new BranchAssignmentDetail
                    {
                        BranchId = id,
                        IsActive = true,
                        IsDeleted = false,
                        CreatedBy = adminId,
                        CreatedDate = now
                    })
                    .ToList()
            });

            request.Status = AccessRequest.Approved;
            request.DecidedBy = adminId;
            request.DecidedByName = adminName;
            request.DecidedDate = now;
            request.DecisionNote = $"{role.ProfileName} · {branchIds.Count} branch(es)";
            request.UserProfileId = user.UserProfileId;

            await _context.SaveChangesAsync();

            await tx.CommitAsync();

            return Ok(new
            {
                Message = $"{user.DisplayName} ({user.ProfileCode}) can sign in now as {user.UserName}.",
                user.ProfileCode
            });
        }
        catch (Exception ex)
        {
            Exception root = ex;
            while (root.InnerException != null)
            {
                root = root.InnerException;
            }

            return StatusCode(500, new { message = "The request could not be approved : " + root.Message });
        }
    }


    //===========================================================
    // Reject : no user is made
    //===========================================================

    [HttpPost("{publicId:guid}/reject")]
    public async Task<IActionResult> Reject(Guid publicId, [FromBody] RejectDto dto)
    {
        if (!await MayAsync("Update"))
        {
            return StatusCode(403, new { message = "Rejecting a request needs Update on Access Requests." });
        }

        AccessRequest? request = await _context.Set<AccessRequest>()
            .FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (request == null)
        {
            return NotFound(new { message = "This request no longer exists." });
        }

        if (request.Status != AccessRequest.Pending)
        {
            return Conflict(new { message = $"This request was already {request.Status.ToLower()}." });
        }

        string reason = (dto?.Reason ?? string.Empty).Trim();

        request.Status = AccessRequest.Rejected;
        request.DecidedBy = this.CurrentUserId();
        request.DecidedByName = await CurrentUserNameAsync();
        request.DecidedDate = DateTime.UtcNow;
        request.DecisionNote = reason.Length > 500 ? reason[..500] : reason;

        await _context.SaveChangesAsync();

        return Ok(new { Message = $"The request from {request.UserName} was rejected." });
    }
}
