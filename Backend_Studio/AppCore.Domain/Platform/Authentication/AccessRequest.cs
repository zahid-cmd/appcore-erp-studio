//===============================================================
// Access Request (2026-11-20)
//
// "Register Now" on the sign-in page stores one of these instead
// of making a user (table "AccessRequests", made by
// Database/AccessRequests_Setup.sql, mapped in AppDbContext).
// The administrator approves it (the user is made then, with the
// role and branches chosen) or rejects it.
//
//   Status        Pending / Approved / Rejected
//   PasswordHash  PBKDF2, the same format as UserCredentials;
//                 copied to the new user on approval
//===============================================================

namespace AppCore.Domain.Platform.Authentication;

public class AccessRequest
{
    public const string Pending = "Pending";

    public const string Approved = "Approved";

    public const string Rejected = "Rejected";

    public long AccessRequestId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string UserName { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string MobileNo { get; set; } = string.Empty;

    public string UserPhotoPath { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Status { get; set; } = Pending;

    public string RequestIp { get; set; } = string.Empty;

    public DateTime RequestedDate { get; set; } = DateTime.UtcNow;

    public long? DecidedBy { get; set; }

    public string DecidedByName { get; set; } = string.Empty;

    public DateTime? DecidedDate { get; set; }

    public string DecisionNote { get; set; } = string.Empty;

    public long? UserProfileId { get; set; }
}
