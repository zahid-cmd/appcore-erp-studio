//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared;


//===============================================================
// Database Migration Tracker
//===============================================================

public class DatabaseMigrationTracker
{

    //===========================================================
    // Track Migration
    //===========================================================

    public async Task<DatabaseMigrationInfo>
        TrackAsync
        (
            DatabaseInitializationContext
                initializationContext,

            DatabaseArtifactIdentity
                artifactIdentity
        )
    {

        //=======================================================
        // Initialize Migration Information
        //=======================================================

        DatabaseMigrationInfo
            migrationInfo =
                new DatabaseMigrationInfo
                {
                    MigrationKey =
                        artifactIdentity.MigrationKey,

                    MigrationName =
                        artifactIdentity.MigrationName
                };


        //=======================================================
        // Validate Backend Solution Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext
                    .BackendSolutionPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Solution path is required " +
                "for migration tracking."
            );
        }


        //=======================================================
        // Validate Infrastructure Project Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext
                    .BackendInfrastructureProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Infrastructure Project path is required " +
                "for migration tracking."
            );
        }


        //=======================================================
        // Validate Startup Project Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext
                    .BackendStartupProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Startup Project path is required " +
                "for migration tracking."
            );
        }


        //=======================================================
        // Resolve Backend Solution Directory
        //=======================================================

        string
            backendSolutionDirectory =
                ResolveBackendSolutionDirectory
                (
                    initializationContext
                        .BackendSolutionPath
                );


        //=======================================================
        // Resolve Infrastructure Project Path
        //=======================================================

        string
            infrastructureProjectPath =
                ResolveProjectPath
                (
                    backendSolutionDirectory,

                    initializationContext
                        .BackendInfrastructureProjectPath
                );


        //=======================================================
        // Resolve Infrastructure Project Directory
        //=======================================================

        string?
            infrastructureProjectDirectory =
                Path.GetDirectoryName
                (
                    infrastructureProjectPath
                );


        if
        (
            string.IsNullOrWhiteSpace
            (
                infrastructureProjectDirectory
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Infrastructure Project directory could not be resolved."
            );
        }


        //=======================================================
        // Resolve Startup Project Path
        //=======================================================

        string
            startupProjectPath =
                ResolveProjectPath
                (
                    backendSolutionDirectory,

                    initializationContext
                        .BackendStartupProjectPath
                );


        //=======================================================
        // Resolve Startup Project Directory
        //=======================================================

        string?
            startupProjectDirectory =
                Path.GetDirectoryName
                (
                    startupProjectPath
                );


        if
        (
            string.IsNullOrWhiteSpace
            (
                startupProjectDirectory
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend Startup Project directory could not be resolved."
            );
        }


        //=======================================================
        // Resolve Migrations Directory
        //=======================================================

        string
            migrationsDirectory =
                Path.Combine
                (
                    infrastructureProjectDirectory,

                    "Migrations"
                );


        //=======================================================
        // Inspect Physical Migration Files
        //=======================================================

        if
        (
            Directory.Exists
            (
                migrationsDirectory
            )
        )
        {

            string[]
                migrationFiles =
                    Directory.GetFiles
                    (
                        migrationsDirectory,

                        $"*_{artifactIdentity.MigrationName}.cs",

                        SearchOption.TopDirectoryOnly
                    );


            string?
                migrationFile =
                    migrationFiles
                        .FirstOrDefault
                        (
                            file =>
                                !file.EndsWith
                                (
                                    ".Designer.cs",

                                    StringComparison.OrdinalIgnoreCase
                                )
                        );


            if
            (
                !string.IsNullOrWhiteSpace
                (
                    migrationFile
                )
            )
            {

                //===================================================
                // Migration Exists
                //===================================================

                migrationInfo.MigrationExists =
                    true;


                //===================================================
                // Resolve Actual Migration ID
                //===================================================

                string
                    migrationFileName =
                        Path.GetFileNameWithoutExtension
                        (
                            migrationFile
                        );


                migrationInfo.MigrationId =
                    migrationFileName;


                //===================================================
                // Inspect Designer File
                //===================================================

                string
                    designerFile =
                        Path.Combine
                        (
                            migrationsDirectory,

                            $"{migrationFileName}.Designer.cs"
                        );


                migrationInfo.DesignerExists =
                    File.Exists
                    (
                        designerFile
                    );
            }
        }


        //=======================================================
        // Inspect EF Core Migrations
        //=======================================================

        string
            migrationListOutput =
                await GetMigrationListAsync
                (
                    infrastructureProjectPath,

                    startupProjectPath,

                    startupProjectDirectory
                );


        //=======================================================
        // Resolve Registered Migration
        //=======================================================

        string?
            registeredMigrationId =
                ResolveRegisteredMigrationId
                (
                    migrationListOutput,

                    artifactIdentity
                        .MigrationName
                );


        if
        (
            !string.IsNullOrWhiteSpace
            (
                registeredMigrationId
            )
        )
        {

            //===================================================
            // Migration Is Registered
            //===================================================

            migrationInfo.IsRegistered =
                true;


            //===================================================
            // Resolve Migration ID
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace
                (
                    migrationInfo.MigrationId
                )
            )
            {
                migrationInfo.MigrationId =
                    registeredMigrationId;
            }


            //===================================================
            // Resolve Applied State
            //===================================================

            migrationInfo.IsApplied =
                IsMigrationApplied
                (
                    migrationListOutput,

                    registeredMigrationId
                );
        }


        //=======================================================
        // Return Migration Information
        //=======================================================

        return
            migrationInfo;
    }


    //===========================================================
    // Get Migration List
    //===========================================================

    private static async Task<string>
        GetMigrationListAsync
        (
            string
                infrastructureProjectPath,

            string
                startupProjectPath,

            string
                startupProjectDirectory
        )
    {

        //=======================================================
        // Resolve Infrastructure Project Argument
        //=======================================================

        string
            infrastructureProjectArgument =
                ResolveRelativePath
                (
                    startupProjectDirectory,

                    infrastructureProjectPath
                );


        //=======================================================
        // Resolve Startup Project Argument
        //=======================================================

        string
            startupProjectArgument =
                $".\\{Path.GetFileName(startupProjectPath)}";


        //=======================================================
        // Build EF Core Command
        //=======================================================

        string
            arguments =
                "ef migrations list " +
                "--context \"AppDbContext\" " +
                "--project " +
                $"\"{infrastructureProjectArgument}\" " +
                "--startup-project " +
                $"\"{startupProjectArgument}\"";


        //=======================================================
        // Execute Command
        //=======================================================

        return
            await ExecuteAsync
            (
                startupProjectDirectory,

                arguments,

                "EF Core migration inspection"
            );
    }


    //===========================================================
    // Resolve Registered Migration ID
    //===========================================================

    private static string?
        ResolveRegisteredMigrationId
        (
            string
                migrationListOutput,

            string
                migrationName
        )
    {

        //=======================================================
        // Validate Migration Output
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                migrationListOutput
            )
        )
        {
            return
                null;
        }


        //=======================================================
        // Inspect Migration Lines
        //=======================================================

        string[]
            migrationLines =
                migrationListOutput
                    .Split
                    (
                        Environment.NewLine,

                        StringSplitOptions.RemoveEmptyEntries
                    );


        foreach
        (
            string migrationLine
            in migrationLines
        )
        {

            string
                normalizedMigrationLine =
                    migrationLine
                        .Trim();


            if
            (
                normalizedMigrationLine.StartsWith
                (
                    "Build started",

                    StringComparison.OrdinalIgnoreCase
                )
                ||
                normalizedMigrationLine.StartsWith
                (
                    "Build succeeded",

                    StringComparison.OrdinalIgnoreCase
                )
                ||
                normalizedMigrationLine.StartsWith
                (
                    "Done.",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }


            int
                migrationNameIndex =
                    normalizedMigrationLine
                        .IndexOf
                        (
                            migrationName,

                            StringComparison.OrdinalIgnoreCase
                        );


            if
            (
                migrationNameIndex < 0
            )
            {
                continue;
            }


            string
                migrationId =
                    normalizedMigrationLine;


            if
            (
                migrationId.StartsWith
                (
                    "->",

                    StringComparison.Ordinal
                )
            )
            {
                migrationId =
                    migrationId
                        .Substring
                        (
                            2
                        )
                        .Trim();
            }


            int
                appliedIndex =
                    migrationId
                        .IndexOf
                        (
                            " (Pending)",

                            StringComparison.OrdinalIgnoreCase
                        );


            if
            (
                appliedIndex >= 0
            )
            {
                migrationId =
                    migrationId
                        .Substring
                        (
                            0,

                            appliedIndex
                        )
                        .Trim();
            }


            if
            (
                migrationId.EndsWith
                (
                    migrationName,

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return
                    migrationId;
            }
        }


        //=======================================================
        // Migration Not Registered
        //=======================================================

        return
            null;
    }


    //===========================================================
    // Resolve Migration Applied State
    //===========================================================

    private static bool
        IsMigrationApplied
        (
            string
                migrationListOutput,

            string
                migrationId
        )
    {

        //=======================================================
        // Validate Migration Output
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                migrationListOutput
            )
        )
        {
            return
                false;
        }


        //=======================================================
        // Inspect Migration Lines
        //=======================================================

        string[]
            migrationLines =
                migrationListOutput
                    .Split
                    (
                        Environment.NewLine,

                        StringSplitOptions.RemoveEmptyEntries
                    );


        foreach
        (
            string migrationLine
            in migrationLines
        )
        {

            string
                normalizedMigrationLine =
                    migrationLine
                        .Trim();


            if
            (
                !normalizedMigrationLine.Contains
                (
                    migrationId,

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }


            return
                !normalizedMigrationLine.Contains
                (
                    "(Pending)",

                    StringComparison.OrdinalIgnoreCase
                );
        }


        //=======================================================
        // Migration Not Found
        //=======================================================

        return
            false;
    }


    //===========================================================
    // Resolve Project Path
    //===========================================================

    private static string
        ResolveProjectPath
        (
            string
                backendSolutionDirectory,

            string
                projectPath
        )
    {

        //=======================================================
        // Normalize Project Path
        //=======================================================

        string
            normalizedProjectPath =
                NormalizeProjectPath
                (
                    projectPath
                );


        //=======================================================
        // Project Path Is Absolute
        //=======================================================

        if
        (
            Path.IsPathRooted
            (
                normalizedProjectPath
            )
        )
        {

            //===================================================
            // Exact Project File
            //===================================================

            if
            (
                File.Exists
                (
                    normalizedProjectPath
                )
            )
            {
                return
                    normalizedProjectPath;
            }


            //===================================================
            // Project Directory
            //===================================================

            if
            (
                Directory.Exists
                (
                    normalizedProjectPath
                )
            )
            {
                return
                    ResolveProjectFileFromDirectory
                    (
                        normalizedProjectPath
                    );
            }
        }


        //=======================================================
        // Resolve From Backend Solution Directory
        //=======================================================

        string
            solutionRelativeProjectPath =
                Path.Combine
                (
                    backendSolutionDirectory,

                    normalizedProjectPath
                );


        if
        (
            File.Exists
            (
                solutionRelativeProjectPath
            )
        )
        {
            return
                solutionRelativeProjectPath;
        }


        if
        (
            Directory.Exists
            (
                solutionRelativeProjectPath
            )
        )
        {
            return
                ResolveProjectFileFromDirectory
                (
                    solutionRelativeProjectPath
                );
        }


        //=======================================================
        // Resolve From Backend Solution Parent Directory
        //=======================================================

        string?
            backendSolutionParentDirectory =
                Directory.GetParent
                (
                    backendSolutionDirectory
                )
                ?.FullName;


        if
        (
            !string.IsNullOrWhiteSpace
            (
                backendSolutionParentDirectory
            )
        )
        {

            string
                parentRelativeProjectPath =
                    Path.Combine
                    (
                        backendSolutionParentDirectory,

                        normalizedProjectPath
                    );


            if
            (
                File.Exists
                (
                    parentRelativeProjectPath
                )
            )
            {
                return
                    parentRelativeProjectPath;
            }


            if
            (
                Directory.Exists
                (
                    parentRelativeProjectPath
                )
            )
            {
                return
                    ResolveProjectFileFromDirectory
                    (
                        parentRelativeProjectPath
                    );
            }
        }


        //=======================================================
        // Resolve Project Name From Solution Directory
        //=======================================================

        string
            projectName =
                ResolveProjectName
                (
                    normalizedProjectPath
                );


        if
        (
            !string.IsNullOrWhiteSpace
            (
                projectName
            )
        )
        {

            string
                expectedProjectFileName =
                    $"{projectName}.csproj";


            string[]
                projectFiles =
                    Directory.GetFiles
                    (
                        backendSolutionDirectory,

                        expectedProjectFileName,

                        SearchOption.AllDirectories
                    );


            if
            (
                projectFiles.Length == 1
            )
            {
                return
                    projectFiles[0];
            }


            if
            (
                projectFiles.Length > 1
            )
            {
                throw new InvalidOperationException
                (
                    $"Multiple project files named " +
                    $"'{expectedProjectFileName}' were found under backend solution " +
                    $"'{backendSolutionDirectory}'."
                );
            }


            if
            (
                !string.IsNullOrWhiteSpace
                (
                    backendSolutionParentDirectory
                )
            )
            {

                projectFiles =
                    Directory.GetFiles
                    (
                        backendSolutionParentDirectory,

                        expectedProjectFileName,

                        SearchOption.AllDirectories
                    );


                if
                (
                    projectFiles.Length == 1
                )
                {
                    return
                        projectFiles[0];
                }


                if
                (
                    projectFiles.Length > 1
                )
                {
                    throw new InvalidOperationException
                    (
                        $"Multiple project files named " +
                        $"'{expectedProjectFileName}' were found under backend root " +
                        $"'{backendSolutionParentDirectory}'."
                    );
                }
            }
        }


        //=======================================================
        // Project Not Found
        //=======================================================

        throw new FileNotFoundException
        (
            $"Project could not be resolved from " +
            $"'{projectPath}'. " +
            $"Backend solution directory: " +
            $"'{backendSolutionDirectory}'."
        );
    }


    //===========================================================
    // Normalize Project Path
    //===========================================================

    private static string
        NormalizeProjectPath
        (
            string
                projectPath
        )
    {

        if
        (
            string.IsNullOrWhiteSpace
            (
                projectPath
            )
        )
        {
            return
                string.Empty;
        }


        string
            normalizedProjectPath =
                projectPath
                    .Trim()
                    .Trim
                    (
                        '"'
                    );


        normalizedProjectPath =
            normalizedProjectPath
                .Replace
                (
                    '/',
                    Path.DirectorySeparatorChar
                )
                .Replace
                (
                    '\\',
                    Path.DirectorySeparatorChar
                );


        return
            normalizedProjectPath;
    }


    //===========================================================
    // Resolve Project Name
    //===========================================================

    private static string
        ResolveProjectName
        (
            string
                projectPath
        )
    {

        string
            projectFileOrDirectoryName =
                Path.GetFileName
                (
                    projectPath
                        .TrimEnd
                        (
                            Path.DirectorySeparatorChar,

                            Path.AltDirectorySeparatorChar
                        )
                );


        if
        (
            projectFileOrDirectoryName.EndsWith
            (
                ".csproj",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return
                Path.GetFileNameWithoutExtension
                (
                    projectFileOrDirectoryName
                );
        }


        return
            projectFileOrDirectoryName;
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


        return
            projectFiles[0];
    }


    //===========================================================
    // Resolve Backend Solution Directory
    //===========================================================

    private static string
        ResolveBackendSolutionDirectory
        (
            string
                backendSolutionPath
        )
    {

        //=======================================================
        // Backend Solution File
        //=======================================================

        if
        (
            File.Exists
            (
                backendSolutionPath
            )
        )
        {
            string?
                solutionDirectory =
                    Path.GetDirectoryName
                    (
                        backendSolutionPath
                    );


            if
            (
                !string.IsNullOrWhiteSpace
                (
                    solutionDirectory
                )
            )
            {
                return
                    solutionDirectory;
            }
        }


        //=======================================================
        // Backend Solution Directory
        //=======================================================

        if
        (
            Directory.Exists
            (
                backendSolutionPath
            )
        )
        {
            return
                backendSolutionPath;
        }


        //=======================================================
        // Backend Solution Not Found
        //=======================================================

        throw new DirectoryNotFoundException
        (
            $"Backend Solution directory was not found: " +
            $"{backendSolutionPath}"
        );
    }


    //===========================================================
    // Resolve Relative Path
    //===========================================================

    private static string
        ResolveRelativePath
        (
            string
                basePath,

            string
                targetPath
        )
    {

        string
            relativePath =
                Path.GetRelativePath
                (
                    basePath,

                    targetPath
                );


        if
        (
            string.IsNullOrWhiteSpace
            (
                relativePath
            )
        )
        {
            return
                $".\\{Path.GetFileName(targetPath)}";
        }


        if
        (
            relativePath.StartsWith
            (
                ".",

                StringComparison.Ordinal
            )
        )
        {
            return
                relativePath;
        }


        return
            $".\\{relativePath}";
    }


    //===========================================================
    // Execute EF Core Command
    //===========================================================

    private static async Task<string>
        ExecuteAsync
        (
            string
                workingDirectory,

            string
                arguments,

            string
                operationName
        )
    {

        //=======================================================
        // Validate Working Directory
        //=======================================================

        if
        (
            !Directory.Exists
            (
                workingDirectory
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Backend solution directory was not found: " +
                $"{workingDirectory}"
            );
        }


        //=======================================================
        // Configure Process
        //=======================================================

        using Process
            process =
                new Process();


        process.StartInfo =
            new ProcessStartInfo
            {
                FileName =
                    "dotnet",

                Arguments =
                    arguments,

                WorkingDirectory =
                    workingDirectory,

                RedirectStandardOutput =
                    true,

                RedirectStandardError =
                    true,

                UseShellExecute =
                    false,

                CreateNoWindow =
                    true
            };


        //=======================================================
        // Start Process
        //=======================================================

        process.Start();


        //=======================================================
        // Read Process Output
        //=======================================================

        Task<string>
            standardOutputTask =
                process.StandardOutput
                    .ReadToEndAsync();


        Task<string>
            standardErrorTask =
                process.StandardError
                    .ReadToEndAsync();


        await process
            .WaitForExitAsync();


        string
            standardOutput =
                await standardOutputTask;


        string
            standardError =
                await standardErrorTask;


        //=======================================================
        // Combine Process Output
        //=======================================================

        string
            commandOutput =
                string.Join
                (
                    Environment.NewLine,

                    new[]
                    {
                        standardOutput,

                        standardError
                    }
                    .Where
                    (
                        output =>
                            !string.IsNullOrWhiteSpace
                            (
                                output
                            )
                    )
                );


        //=======================================================
        // Validate Process Result
        //=======================================================

        if
        (
            process.ExitCode != 0
        )
        {
            string
                errorMessage =
                    !string.IsNullOrWhiteSpace
                    (
                        commandOutput
                    )
                    ? commandOutput
                    : "No output was returned by the EF Core command.";


            throw new InvalidOperationException
            (
                $"{operationName} failed. " +
                $"Command: dotnet {arguments} " +
                $"{Environment.NewLine}" +
                $"{errorMessage}"
            );
        }


        //=======================================================
        // Return Process Output
        //=======================================================

        return
            commandOutput;
    }

}