//===============================================================
// Namespaces
//===============================================================

using System.Security.Claims;

using Microsoft.AspNetCore.Http;

using AppCore.Application.Platform.CurrentUser;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Extensions;


//===============================================================
// Current User Service
//===============================================================
//
// Reads the user of the current request through
// IHttpContextAccessor. Outside a request (background jobs)
// HttpContext is null, so every value falls back to System.
//
// Registered in Program.cs :
//
//     builder.Services.AddHttpContextAccessor();
//     builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
//
//===============================================================

public class CurrentUserService : ICurrentUserService
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IHttpContextAccessor
        _httpContextAccessor;


    //===========================================================
    // Constructor
    //===========================================================

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor =
            httpContextAccessor;
    }


    //===========================================================
    // Request User (null outside a request)
    //===========================================================

    private ClaimsPrincipal? User =>
        _httpContextAccessor.HttpContext?.User;


    //===========================================================
    // Values
    //===========================================================

    public bool IsAuthenticated =>
        User.IsLoggedIn();

    public long UserId =>
        User.GetUserId();

    public string UserName =>
        User.GetLoginId();

    public string DisplayName =>
        User.GetDisplayName();

    public string PerformedByName =>
        User.GetPerformedByName();

    public long? BranchId =>
        User.GetBranchId();
}