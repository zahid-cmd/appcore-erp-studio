//===============================================================
// Namespaces
//===============================================================

using Microsoft.Extensions.DependencyInjection;

using AppCore.Application.Platform.Authentication.Interfaces;
using AppCore.Application.Platform.Authentication.Services;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application;


//===============================================================
// Dependency Injection
//===============================================================

public static class DependencyInjection
{
    //===========================================================
    // Register Application Services
    //===========================================================

    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        //=======================================================
        // Authentication Services
        //=======================================================

        services.AddScoped
        <
            IAuthenticationService,
            AuthenticationService
        >();


        //=======================================================
        // Return Services
        //=======================================================

        return services;
    }
}