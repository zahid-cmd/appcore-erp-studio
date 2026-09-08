//===============================================================
// Namespaces
//===============================================================

using System.IO;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine;


//===============================================================
// Migration Project
//===============================================================

public sealed class MigrationProject
{

    //===========================================================
    // Backend Studio Root
    //===========================================================

    public string BackendStudioRoot
    {
        get;
    }


    //===========================================================
    // Infrastructure Project
    //===========================================================

    public string InfrastructureProject
    {
        get;
    }


    //===========================================================
    // Infrastructure Project File
    //===========================================================

    public string InfrastructureProjectFile
    {
        get;
    }


    //===========================================================
    // API Project
    //===========================================================

    public string ApiProject
    {
        get;
    }


    //===========================================================
    // API Project File
    //===========================================================

    public string ApiProjectFile
    {
        get;
    }


    //===========================================================
    // Migrations Directory
    //===========================================================

    public string MigrationsPath
    {
        get;
    }


    //===========================================================
    // Constructor
    //===========================================================

    public MigrationProject
    (
        string backendStudioRoot,

        string infrastructureProject,

        string infrastructureProjectFile,

        string apiProject,

        string apiProjectFile,

        string migrationsPath
    )
    {
        BackendStudioRoot =
            backendStudioRoot;


        InfrastructureProject =
            infrastructureProject;


        InfrastructureProjectFile =
            infrastructureProjectFile;


        ApiProject =
            apiProject;


        ApiProjectFile =
            apiProjectFile;


        MigrationsPath =
            migrationsPath;
    }
}



//===============================================================
// Migration Project Resolver
//===============================================================

public class MigrationProjectResolver
{

    //===========================================================
    // Resolve Migration Project
    //===========================================================

    public Task<MigrationProject> ResolveAsync
    (
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();


        var backendStudioRoot =
            ResolveBackendStudioRoot();


        var infrastructureProject =
            ResolveInfrastructureProject();


        var infrastructureProjectFile =
            ResolveInfrastructureProjectFile();


        var apiProject =
            ResolveApiProject();


        var apiProjectFile =
            ResolveApiProjectFile();


        var migrationsPath =
            ResolveMigrationsDirectory();


        var project =
            new MigrationProject
            (
                backendStudioRoot,

                infrastructureProject,

                infrastructureProjectFile,

                apiProject,

                apiProjectFile,

                migrationsPath
            );


        return Task.FromResult
        (
            project
        );
    }



    //===========================================================
    // Resolve Backend Studio Root
    //===========================================================

    public string ResolveBackendStudioRoot()
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
            var infrastructureProject =
                Path.Combine
                (
                    currentDirectory.FullName,

                    "AppCore.Infrastructure",

                    "AppCore.Infrastructure.csproj"
                );


            var apiProject =
                Path.Combine
                (
                    currentDirectory.FullName,

                    "AppCore.API",

                    "AppCore.API.csproj"
                );


            if
            (
                File.Exists
                (
                    infrastructureProject
                )
                &&
                File.Exists
                (
                    apiProject
                )
            )
            {
                return currentDirectory.FullName;
            }


            currentDirectory =
                currentDirectory.Parent;
        }


        throw new DirectoryNotFoundException
        (
            "Backend Studio root could not be resolved."
        );
    }



    //===========================================================
    // Resolve Infrastructure Project
    //===========================================================

    public string ResolveInfrastructureProject()
    {
        var backendStudioRoot =
            ResolveBackendStudioRoot();


        var infrastructureProject =
            Path.Combine
            (
                backendStudioRoot,

                "AppCore.Infrastructure"
            );


        if
        (
            !Directory.Exists
            (
                infrastructureProject
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"AppCore.Infrastructure project could not be found: {infrastructureProject}"
            );
        }


        return infrastructureProject;
    }



    //===========================================================
    // Resolve Infrastructure Project File
    //===========================================================

    public string ResolveInfrastructureProjectFile()
    {
        var infrastructureProject =
            ResolveInfrastructureProject();


        var projectFile =
            Path.Combine
            (
                infrastructureProject,

                "AppCore.Infrastructure.csproj"
            );


        if
        (
            !File.Exists
            (
                projectFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"AppCore.Infrastructure project file could not be found: {projectFile}"
            );
        }


        return projectFile;
    }



    //===========================================================
    // Resolve API Project
    //===========================================================

    public string ResolveApiProject()
    {
        var backendStudioRoot =
            ResolveBackendStudioRoot();


        var apiProject =
            Path.Combine
            (
                backendStudioRoot,

                "AppCore.API"
            );


        if
        (
            !Directory.Exists
            (
                apiProject
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"AppCore.API project could not be found: {apiProject}"
            );
        }


        return apiProject;
    }



    //===========================================================
    // Resolve API Project File
    //===========================================================

    public string ResolveApiProjectFile()
    {
        var apiProject =
            ResolveApiProject();


        var projectFile =
            Path.Combine
            (
                apiProject,

                "AppCore.API.csproj"
            );


        if
        (
            !File.Exists
            (
                projectFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"AppCore.API project file could not be found: {projectFile}"
            );
        }


        return projectFile;
    }



    //===========================================================
    // Resolve Migrations Directory
    //===========================================================

    public string ResolveMigrationsDirectory()
    {
        var infrastructureProject =
            ResolveInfrastructureProject();


        var migrationsDirectory =
            Path.Combine
            (
                infrastructureProject,

                "Migrations"
            );


        if
        (
            !Directory.Exists
            (
                migrationsDirectory
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Migrations directory could not be found: {migrationsDirectory}"
            );
        }


        return migrationsDirectory;
    }
}