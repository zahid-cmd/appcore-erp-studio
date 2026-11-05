//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.UserProfile.DTOs;


//===============================================================
// User Profile list : paged list request
//---------------------------------------------------------------
// GET api/security-permission/user-management/user-profile/paged
//     ?page=1&pageSize=10&search=rahim&sort=UserName&dir=asc
//     &status=active
//
// Status : active / inactive; empty = all.
// Search : code, user name, display name, full name, primary
//          role, email, mobile no.
// Sort   : ProfileCode, UserName, DisplayName, FullName,
//          PrimaryRoleName, Email, MobileNo, IsActive.
//          Default : ProfileCode.
// Counts : "Total", "Active", "Inactive" (the summary line;
//          search applied, not the status).
// Photos are not sent with the list (UserPhotoData empty).
//===============================================================

public class UserProfilesPageRequest : PagedRequest
{
    public string? Status { get; set; }
}
