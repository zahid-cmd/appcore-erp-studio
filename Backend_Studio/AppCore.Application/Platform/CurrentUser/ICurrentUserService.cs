//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.CurrentUser;


//===============================================================
// Current User Service
//===============================================================
//
// The user who sent the current request, read from the login
// token (JWT).
//
// Inject it in any repository / service that needs to know who
// is working (activity history, created by, posted by ...).
//
// Outside a request (background jobs such as the nightly Auto
// Settlement) there is no user, so the values fall back to the
// System user:
//
//     UserId          = 1
//     PerformedByName = "System"
//
//===============================================================

public interface ICurrentUserService
{
    //===========================================================
    // True when the request carries a valid login token
    //===========================================================

    bool IsAuthenticated { get; }


    //===========================================================
    // User Profile Id (falls back to 1 = System)
    //===========================================================

    long UserId { get; }


    //===========================================================
    // Login ID (empty when not logged in)
    //===========================================================

    string UserName { get; }


    //===========================================================
    // Display Name (empty when not logged in)
    //===========================================================

    string DisplayName { get; }


    //===========================================================
    // Name for activity history
    //
    //     Display Name → Login ID → "System"
    //===========================================================

    string PerformedByName { get; }


    //===========================================================
    // Branch selected at login (null when not logged in)
    //===========================================================

    long? BranchId { get; }
}