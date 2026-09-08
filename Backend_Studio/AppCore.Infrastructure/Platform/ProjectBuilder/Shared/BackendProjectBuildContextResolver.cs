//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Platform.ProjectBuilder.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.ProjectBuilder.Shared;


//===============================================================
// Backend Project Build Context Resolver
//===============================================================

public class BackendProjectBuildContextResolver
{


    //===========================================================
    // Resolve Backend Studio Root
    //===========================================================

    public string
        ResolveBackendStudioRoot()
    {
        var currentDirectory =
            new DirectoryInfo
            (
                Directory.GetCurrentDirectory()
            );


        while
        (
            currentDirectory != null
        )
        {
            var infrastructureProjectPath =
                Path.Combine
                (
                    currentDirectory.FullName,

                    "AppCore.Infrastructure"
                );


            if
            (
                Directory.Exists
                (
                    infrastructureProjectPath
                )
            )
            {
                return currentDirectory.FullName;
            }


            currentDirectory =
                currentDirectory.Parent;
        }


        throw new InvalidOperationException
        (
            "Backend Studio root directory could not be resolved."
        );
    }



    //===========================================================
    // Resolve Build Context
    //===========================================================

    public BackendProjectBuildContext
        Resolve()
    {
        var backendStudioRoot =
            ResolveBackendStudioRoot();


        var infrastructureProjectPath =
            Path.Combine
            (
                backendStudioRoot,

                "AppCore.Infrastructure"
            );


        var infrastructureProjectFile =
            Path.Combine
            (
                infrastructureProjectPath,

                "AppCore.Infrastructure.csproj"
            );


        if
        (
            !File.Exists
            (
                infrastructureProjectFile
            )
        )
        {
            throw new InvalidOperationException
            (
                "AppCore.Infrastructure project file could not be found."
            );
        }


        return new BackendProjectBuildContext
        {
            BackendStudioRoot =
                backendStudioRoot,

            InfrastructureProjectPath =
                infrastructureProjectPath,

            InfrastructureProjectFile =
                infrastructureProjectFile
        };
    }

}