//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;


//===============================================================
// Database Project Resolver
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine;


//===============================================================
// Database Project Resolver
//===============================================================

public class DatabaseProjectResolver
{
    //===========================================================
    // Resolve Backend Studio Root
    //===========================================================

    public Task<string> ResolveBackendStudioRootAsync()
    {
        var currentDirectory =
            new DirectoryInfo(
                AppContext.BaseDirectory
            );


        while
        (
            currentDirectory != null
        )
        {
            var infrastructureProject =
                Directory.GetFiles(
                    currentDirectory.FullName,
                    "AppCore.Infrastructure.csproj",
                    SearchOption.AllDirectories
                )
                .FirstOrDefault();


            var apiProject =
                Directory.GetFiles(
                    currentDirectory.FullName,
                    "AppCore.API.csproj",
                    SearchOption.AllDirectories
                )
                .FirstOrDefault()
                ??
                Directory.GetFiles(
                    currentDirectory.FullName,
                    "AppCore.Api.csproj",
                    SearchOption.AllDirectories
                )
                .FirstOrDefault();


            if
            (
                infrastructureProject != null
                &&
                apiProject != null
            )
            {
                return Task.FromResult(
                    currentDirectory.FullName
                );
            }


            currentDirectory =
                currentDirectory.Parent;
        }


        throw new DirectoryNotFoundException(
            "Unable to locate the Backend_Studio root containing AppCore.Infrastructure and AppCore.API."
        );
    }


    //===========================================================
    // Resolve Infrastructure Project
    //===========================================================

    public async Task<string> ResolveInfrastructureProjectAsync()
    {
        var backendStudioRoot =
            await ResolveBackendStudioRootAsync();


        var infrastructureProject =
            Directory.GetFiles(
                backendStudioRoot,
                "AppCore.Infrastructure.csproj",
                SearchOption.AllDirectories
            )
            .FirstOrDefault();


        if
        (
            infrastructureProject == null
        )
        {
            throw new FileNotFoundException(
                "AppCore.Infrastructure.csproj could not be found.",
                backendStudioRoot
            );
        }


        return infrastructureProject;
    }


    //===========================================================
    // Resolve API Project
    //===========================================================

    public async Task<string> ResolveApiProjectAsync()
    {
        var backendStudioRoot =
            await ResolveBackendStudioRootAsync();


        var apiProject =
            Directory.GetFiles(
                backendStudioRoot,
                "AppCore.API.csproj",
                SearchOption.AllDirectories
            )
            .FirstOrDefault()
            ??
            Directory.GetFiles(
                backendStudioRoot,
                "AppCore.Api.csproj",
                SearchOption.AllDirectories
            )
            .FirstOrDefault();


        if
        (
            apiProject == null
        )
        {
            throw new FileNotFoundException(
                "AppCore.API.csproj or AppCore.Api.csproj could not be found.",
                backendStudioRoot
            );
        }


        return apiProject;
    }
}