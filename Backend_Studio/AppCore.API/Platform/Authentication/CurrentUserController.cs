//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Platform;


//===============================================================
// Current User Controller
//
//   GET  /api/platform/current-user
//
// Returns who the API thinks is calling, read from the login
// token. Used to check that the logged-in user reaches the
// backend. It only returns the caller's own details.
//===============================================================

[ApiController]
[Route("api/platform/current-user")]
public class CurrentUserController : ControllerBase
{
    //===========================================================
    // Get Current User
    //===========================================================

    [AllowAnonymous]
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(
            new
            {
                isAuthenticated =
                    User.IsLoggedIn(),

                userId =
                    this.CurrentUserId(),

                loginId =
                    User.GetLoginId(),

                displayName =
                    User.GetDisplayName(),

                performedByName =
                    this.CurrentUserName(),

                branchId =
                    this.CurrentBranchId()
            });
    }
}