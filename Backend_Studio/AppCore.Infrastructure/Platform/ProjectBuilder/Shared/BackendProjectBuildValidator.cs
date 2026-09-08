//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Platform.ProjectBuilder.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.ProjectBuilder.Shared;


//===============================================================
// Backend Project Build Validator
//===============================================================

public class BackendProjectBuildValidator
{


    //===========================================================
    // Validate
    //===========================================================

    public void
        Validate
    (
        BackendProjectBuildContext context
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                context.BackendStudioRoot
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Studio root directory is required."
            );
        }


        if
        (
            !Directory.Exists
            (
                context.BackendStudioRoot
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Studio root directory could not be found."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                context.InfrastructureProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "AppCore.Infrastructure project path is required."
            );
        }


        if
        (
            !Directory.Exists
            (
                context.InfrastructureProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "AppCore.Infrastructure project directory could not be found."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                context.InfrastructureProjectFile
            )
        )
        {
            throw new InvalidOperationException
            (
                "AppCore.Infrastructure project file is required."
            );
        }


        if
        (
            !File.Exists
            (
                context.InfrastructureProjectFile
            )
        )
        {
            throw new InvalidOperationException
            (
                "AppCore.Infrastructure project file could not be found."
            );
        }
    }

}