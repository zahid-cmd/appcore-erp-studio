//===============================================================
// Namespaces
//===============================================================

using System.Text.RegularExpressions;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared;


//===============================================================
// Database Initialization Context Resolver
//===============================================================

public class DatabaseInitializationContextResolver
{

    //===========================================================
    // Repository
    //===========================================================

    private readonly ICodeSynchronizationRepository
        _codeSynchronizationRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseInitializationContextResolver
    (
        ICodeSynchronizationRepository
            codeSynchronizationRepository
    )
    {
        _codeSynchronizationRepository =
            codeSynchronizationRepository;
    }


    //===========================================================
    // Resolve
    //===========================================================

    public async Task<DatabaseInitializationContext>
        ResolveAsync
        (
            long synchronizationId
        )
    {

        //=======================================================
        // Validate Synchronization
        //=======================================================

        if
        (
            synchronizationId <= 0
        )
        {
            throw new InvalidOperationException
            (
                "A valid Code Synchronization ID is required."
            );
        }


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var submenuSynchronization =
            await _codeSynchronizationRepository
                .GetSubmenuSynchronizationForRegistrationAsync
                (
                    synchronizationId
                );


        if
        (
            submenuSynchronization is null
        )
        {
            throw new InvalidOperationException
            (
                $"Submenu Synchronization could not be resolved " +
                $"for Code Synchronization ID '{synchronizationId}'."
            );
        }


        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.SubmenuCode
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Submenu Code is missing for Code " +
                $"Synchronization ID '{synchronizationId}'."
            );
        }


        //=======================================================
        // Validate Backend Solution
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.BackendSolution
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Backend Solution path is missing for Code " +
                $"Synchronization ID '{synchronizationId}'."
            );
        }


        if
        (
            !Directory.Exists
            (
                submenuSynchronization.BackendSolution
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Backend Solution directory was not found for Code " +
                $"Synchronization ID '{synchronizationId}': " +
                $"'{submenuSynchronization.BackendSolution}'."
            );
        }


        //=======================================================
        // Validate Backend Infrastructure Project
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.BackendInfrastructureProject
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Backend Infrastructure Project path is missing for Code " +
                $"Synchronization ID '{synchronizationId}'."
            );
        }


        //=======================================================
        // Resolve Backend Infrastructure Project Path
        //=======================================================

        string
            backendInfrastructureProjectPath =
                ResolveProjectPath
                (
                    submenuSynchronization.BackendSolution,

                    submenuSynchronization
                        .BackendInfrastructureProject
                );


        //=======================================================
        // Resolve Backend Startup Project Path
        //=======================================================

        string
            backendStartupProjectPath =
                ResolveStartupProjectPath
                (
                    submenuSynchronization.BackendSolution
                );


        //=======================================================
        // Validate Entity File
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.BackendSubMenuEntityFile
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Backend Entity file path is missing for Code " +
                $"Synchronization ID '{synchronizationId}'."
            );
        }


        if
        (
            !File.Exists
            (
                submenuSynchronization.BackendSubMenuEntityFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Backend Entity file was not found for Code " +
                $"Synchronization ID '{synchronizationId}'.",

                submenuSynchronization.BackendSubMenuEntityFile
            );
        }


        //=======================================================
        // Read Entity File
        //=======================================================

        var entitySource =
            await File.ReadAllTextAsync
            (
                submenuSynchronization.BackendSubMenuEntityFile
            );


        //=======================================================
        // Resolve Entity Name
        //=======================================================

        var entityMatch =
            Regex.Match
            (
                entitySource,

                @"public\s+(?:partial\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)",

                RegexOptions.Multiline
            );


        if
        (
            !entityMatch.Success
        )
        {
            throw new InvalidOperationException
            (
                $"Entity class could not be resolved from " +
                $"'{submenuSynchronization.BackendSubMenuEntityFile}'."
            );
        }


        var entityName =
            entityMatch.Groups[1].Value;


        //=======================================================
        // Validate Configuration File
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization
                    .BackendSubMenuConfigurationFile
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Backend Configuration file path is missing for " +
                $"Code Synchronization ID '{synchronizationId}'."
            );
        }


        if
        (
            !File.Exists
            (
                submenuSynchronization
                    .BackendSubMenuConfigurationFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Backend Configuration file was not found for " +
                $"Code Synchronization ID '{synchronizationId}'.",

                submenuSynchronization
                    .BackendSubMenuConfigurationFile
            );
        }


        //=======================================================
        // Read Configuration File
        //=======================================================

        var configurationSource =
            await File.ReadAllTextAsync
            (
                submenuSynchronization
                    .BackendSubMenuConfigurationFile
            );


        //=======================================================
        // Resolve Table Information
        //=======================================================

        var tableMatch =
            Regex.Match
            (
                configurationSource,

                @"builder\s*\.\s*ToTable\s*\(\s*""([^""]+)""\s*(?:,\s*""([^""]+)"")?\s*\)",

                RegexOptions.Multiline
            );


        if
        (
            !tableMatch.Success
        )
        {
            throw new InvalidOperationException
            (
                $"Database table configuration could not be resolved " +
                $"from '{submenuSynchronization.BackendSubMenuConfigurationFile}'."
            );
        }


        var tableName =
            tableMatch.Groups[1].Value;


        var schema =
            tableMatch.Groups[2].Success
                ? tableMatch.Groups[2].Value
                : null;


        //=======================================================
        // Return Context
        //=======================================================

        return new DatabaseInitializationContext
        {
            SynchronizationId =
                synchronizationId,

            SubmenuCode =
                submenuSynchronization.SubmenuCode,

            EntityName =
                entityName,

            Schema =
                schema,

            TableName =
                tableName,

            BackendSolutionPath =
                submenuSynchronization.BackendSolution,

            BackendInfrastructureProjectPath =
                backendInfrastructureProjectPath,

            BackendStartupProjectPath =
                backendStartupProjectPath
        };
    }


    //===========================================================
    // Resolve Startup Project Path
    //===========================================================

    private static string
        ResolveStartupProjectPath
        (
            string
                backendSolutionPath
        )
    {

        //=======================================================
        // Validate Backend Solution Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                backendSolutionPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Solution path is required to resolve the startup project."
            );
        }


        //=======================================================
        // AppCore.API Project
        //=======================================================

        string
            appCoreApiProjectPath =
                Path.Combine
                (
                    backendSolutionPath,

                    "AppCore.API",

                    "AppCore.API.csproj"
                );


        if
        (
            File.Exists
            (
                appCoreApiProjectPath
            )
        )
        {
            return
                Path.GetFullPath
                (
                    appCoreApiProjectPath
                );
        }


        //=======================================================
        // AppCore.Api Project
        //=======================================================

        string
            appCoreApiAlternateProjectPath =
                Path.Combine
                (
                    backendSolutionPath,

                    "AppCore.Api",

                    "AppCore.Api.csproj"
                );


        if
        (
            File.Exists
            (
                appCoreApiAlternateProjectPath
            )
        )
        {
            return
                Path.GetFullPath
                (
                    appCoreApiAlternateProjectPath
                );
        }


        //=======================================================
        // Inspect API Project Files
        //=======================================================

        string[]
            apiProjectFiles =
                Directory.GetFiles
                (
                    backendSolutionPath,

                    "*.csproj",

                    SearchOption.AllDirectories
                )
                .Where
                (
                    projectFile =>
                        string.Equals
                        (
                            Path.GetFileNameWithoutExtension
                            (
                                projectFile
                            ),

                            "AppCore.API",

                            StringComparison.OrdinalIgnoreCase
                        )
                        ||
                        string.Equals
                        (
                            Path.GetFileNameWithoutExtension
                            (
                                projectFile
                            ),

                            "AppCore.Api",

                            StringComparison.OrdinalIgnoreCase
                        )
                )
                .ToArray();


        //=======================================================
        // Validate API Project Files
        //=======================================================

        if
        (
            apiProjectFiles.Length == 0
        )
        {
            throw new FileNotFoundException
            (
                $"Backend API startup project could not be resolved " +
                $"under Backend Solution '{backendSolutionPath}'."
            );
        }


        if
        (
            apiProjectFiles.Length > 1
        )
        {
            throw new InvalidOperationException
            (
                $"Multiple Backend API startup projects were found " +
                $"under Backend Solution '{backendSolutionPath}'."
            );
        }


        //=======================================================
        // Return Startup Project
        //=======================================================

        return
            Path.GetFullPath
            (
                apiProjectFiles[0]
            );
    }


    //===========================================================
    // Resolve Project Path
    //===========================================================

    private static string
        ResolveProjectPath
        (
            string
                backendSolutionPath,

            string
                projectPath
        )
    {

        //=======================================================
        // Validate Backend Solution Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                backendSolutionPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Solution path is required to resolve the project path."
            );
        }


        //=======================================================
        // Validate Project Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                projectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Project path is required."
            );
        }


        //=======================================================
        // Absolute Project File
        //=======================================================

        if
        (
            Path.IsPathRooted
            (
                projectPath
            )
            &&
            File.Exists
            (
                projectPath
            )
        )
        {
            return
                Path.GetFullPath
                (
                    projectPath
                );
        }


        //=======================================================
        // Absolute Project Directory
        //=======================================================

        if
        (
            Path.IsPathRooted
            (
                projectPath
            )
            &&
            Directory.Exists
            (
                projectPath
            )
        )
        {
            return
                ResolveProjectFileFromDirectory
                (
                    projectPath
                );
        }


        //=======================================================
        // Resolve Relative Project Path
        //=======================================================

        string
            resolvedProjectPath =
                Path.GetFullPath
                (
                    Path.Combine
                    (
                        backendSolutionPath,

                        projectPath
                    )
                );


        //=======================================================
        // Relative Project File
        //=======================================================

        if
        (
            File.Exists
            (
                resolvedProjectPath
            )
        )
        {
            return
                resolvedProjectPath;
        }


        //=======================================================
        // Relative Project Directory
        //=======================================================

        if
        (
            Directory.Exists
            (
                resolvedProjectPath
            )
        )
        {
            return
                ResolveProjectFileFromDirectory
                (
                    resolvedProjectPath
                );
        }


        //=======================================================
        // Resolve Project Name
        //=======================================================

        string
            projectDirectory =
                Path.Combine
                (
                    backendSolutionPath,

                    projectPath
                );


        string
            projectName =
                Path.GetFileName
                (
                    projectPath
                );


        string
            projectFilePath =
                Path.Combine
                (
                    projectDirectory,

                    $"{projectName}.csproj"
                );


        if
        (
            File.Exists
            (
                projectFilePath
            )
        )
        {
            return
                Path.GetFullPath
                (
                    projectFilePath
                );
        }


        //=======================================================
        // Project Not Found
        //=======================================================

        throw new FileNotFoundException
        (
            $"Project could not be resolved from " +
            $"'{projectPath}' under Backend Solution " +
            $"'{backendSolutionPath}'."
        );
    }


    //===========================================================
    // Resolve Project File From Directory
    //===========================================================

    private static string
        ResolveProjectFileFromDirectory
        (
            string
                projectDirectory
        )
    {

        string[]
            projectFiles =
                Directory.GetFiles
                (
                    projectDirectory,

                    "*.csproj",

                    SearchOption.TopDirectoryOnly
                );


        //=======================================================
        // Validate Project Files
        //=======================================================

        if
        (
            projectFiles.Length == 0
        )
        {
            throw new FileNotFoundException
            (
                $"No .csproj file was found in " +
                $"'{projectDirectory}'."
            );
        }


        if
        (
            projectFiles.Length > 1
        )
        {
            throw new InvalidOperationException
            (
                $"Multiple .csproj files were found in " +
                $"'{projectDirectory}'."
            );
        }


        //=======================================================
        // Return Project File
        //=======================================================

        return
            Path.GetFullPath
            (
                projectFiles[0]
            );
    }

}