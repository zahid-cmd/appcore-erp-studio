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
// EF Core Migration Executor
//===============================================================

public class EfCoreMigrationExecutor
{

    //===========================================================
    // Create Migration
    //===========================================================

    public async Task
        CreateMigrationAsync
        (
            string
                backendSolutionPath,

            string
                backendInfrastructureProjectPath,

            string
                backendStartupProjectPath,

            DatabaseArtifactIdentity
                artifactIdentity
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
                "Backend solution path is required for migration creation."
            );
        }


        //=======================================================
        // Validate Infrastructure Project Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                backendInfrastructureProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend infrastructure project path is required for migration creation."
            );
        }


        //=======================================================
        // Validate Startup Project Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                backendStartupProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend startup project path is required for migration creation."
            );
        }


        //=======================================================
        // Validate Migration Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                artifactIdentity.MigrationName
            )
        )
        {
            throw new InvalidOperationException
            (
                "Migration name is required for migration creation."
            );
        }


        //=======================================================
        // Validate Entity Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                artifactIdentity.EntityName
            )
        )
        {
            throw new InvalidOperationException
            (
                "Entity name is required for migration creation."
            );
        }


        //=======================================================
        // Validate Table Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                artifactIdentity.TableName
            )
        )
        {
            throw new InvalidOperationException
            (
                "Table name is required for migration creation."
            );
        }


        //=======================================================
        // Resolve Backend Solution Directory
        //=======================================================

        string
            backendSolutionDirectory =
                ResolveWorkingDirectory
                (
                    backendSolutionPath
                );


        //=======================================================
        // Resolve Infrastructure Project
        //=======================================================

        string
            infrastructureProjectPath =
                ResolveProjectPath
                (
                    backendSolutionDirectory,

                    backendInfrastructureProjectPath
                );


        //=======================================================
        // Resolve Startup Project
        //=======================================================

        string
            startupProjectPath =
                ResolveProjectPath
                (
                    backendSolutionDirectory,

                    backendStartupProjectPath
                );


        //=======================================================
        // Validate Infrastructure Project File
        //=======================================================

        if
        (
            !File.Exists
            (
                infrastructureProjectPath
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Backend Infrastructure Project file was not found: " +
                $"{infrastructureProjectPath}"
            );
        }


        //=======================================================
        // Validate Startup Project File
        //=======================================================

        if
        (
            !File.Exists
            (
                startupProjectPath
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Backend Startup Project file was not found: " +
                $"{startupProjectPath}"
            );
        }


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
                $"Infrastructure Project directory could not be resolved " +
                $"from '{infrastructureProjectPath}'."
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
        // Inspect Existing Migration Files
        //=======================================================

        string[]
            existingMigrationFiles =
                Directory.Exists
                (
                    migrationsDirectory
                )
                ? Directory.GetFiles
                (
                    migrationsDirectory,

                    $"*_{artifactIdentity.MigrationName}.cs",

                    SearchOption.TopDirectoryOnly
                )
                : Array.Empty<string>();


        string?
            existingMigrationFile =
                existingMigrationFiles
                    .FirstOrDefault
                    (
                        file =>
                            !file.EndsWith
                            (
                                ".Designer.cs",

                                StringComparison.OrdinalIgnoreCase
                            )
                    );


        //=======================================================
        // Prevent Duplicate Migration Creation
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace
            (
                existingMigrationFile
            )
        )
        {
            throw new InvalidOperationException
            (
                $"A migration already exists for " +
                $"'{artifactIdentity.MigrationName}' at " +
                $"'{existingMigrationFile}'."
            );
        }


        //=======================================================
        // Create EF Core Migration
        //=======================================================

        string
            arguments =
                $"ef migrations add " +
                $"\"{artifactIdentity.MigrationName}\" " +
                $"--context \"AppDbContext\" " +
                $"--project " +
                $"\"{infrastructureProjectPath}\" " +
                $"--startup-project " +
                $"\"{startupProjectPath}\" " +
                $"--output-dir \"Migrations\"";


        string
            commandOutput =
                await ExecuteAsync
                (
                    backendSolutionDirectory,

                    arguments,

                    "EF Core migration creation"
                );


        //=======================================================
        // Verify Migrations Directory
        //=======================================================

        if
        (
            !Directory.Exists
            (
                migrationsDirectory
            )
        )
        {
            throw new InvalidOperationException
            (
                $"EF Core migration creation completed but the " +
                $"Migrations directory could not be found at " +
                $"'{migrationsDirectory}'. " +
                $"EF Core output: {commandOutput}"
            );
        }


        //=======================================================
        // Resolve Physical Migration Files
        //=======================================================

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
                    .Where
                    (
                        file =>
                            !file.EndsWith
                            (
                                ".Designer.cs",

                                StringComparison.OrdinalIgnoreCase
                            )
                    )
                    .OrderByDescending
                    (
                        File.GetCreationTimeUtc
                    )
                    .FirstOrDefault();


        //=======================================================
        // Verify Physical Migration File
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                migrationFile
            )
        )
        {
            throw new InvalidOperationException
            (
                $"EF Core migration creation completed but the " +
                $"physical migration file " +
                $"'{artifactIdentity.MigrationName}' could not be found " +
                $"under '{migrationsDirectory}'. " +
                $"EF Core output: {commandOutput}"
            );
        }


        //=======================================================
        // Resolve Migration File Name
        //=======================================================

        string
            migrationFileName =
                Path.GetFileNameWithoutExtension
                (
                    migrationFile
                );


        //=======================================================
        // Resolve Migration Designer File
        //=======================================================

        string
            designerFile =
                Path.Combine
                (
                    migrationsDirectory,

                    $"{migrationFileName}.Designer.cs"
                );


        //=======================================================
        // Verify Migration Designer File
        //=======================================================

        if
        (
            !File.Exists
            (
                designerFile
            )
        )
        {
            throw new InvalidOperationException
            (
                $"EF Core migration creation completed but the " +
                $"migration designer file could not be found at " +
                $"'{designerFile}'. " +
                $"EF Core output: {commandOutput}"
            );
        }


        //=======================================================
        // Read Generated Migration
        //=======================================================

        string
            migrationContent =
                await File.ReadAllTextAsync
                (
                    migrationFile
                );


        //=======================================================
        // Verify Migration Is Not Empty
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                migrationContent
            )
        )
        {
            throw new InvalidOperationException
            (
                $"EF Core migration '{artifactIdentity.MigrationName}' " +
                $"was created but contains no migration content."
            );
        }


        //=======================================================
        // Build Expected Table Pattern
        //=======================================================

        string
            expectedCreateTablePattern =
                $"name: \"{artifactIdentity.TableName}\"";


        //=======================================================
        // Verify Expected Table
        //=======================================================

        if
        (
            !migrationContent.Contains
            (
                expectedCreateTablePattern,

                StringComparison.Ordinal
            )
        )
        {
            throw new InvalidOperationException
            (
                $"EF Core migration '{artifactIdentity.MigrationName}' " +
                $"was created but it does not contain the expected table " +
                $"'{artifactIdentity.TableName}'. " +
                $"Expected entity: '{artifactIdentity.EntityName}'."
            );
        }


        //=======================================================
        // Count Created Tables
        //=======================================================

        int
            createTableCount =
                CountOccurrences
                (
                    migrationContent,

                    "migrationBuilder.CreateTable"
                );


        //=======================================================
        // Validate Migration Scope
        //=======================================================

        if
        (
            createTableCount == 0
        )
        {
            throw new InvalidOperationException
            (
                $"EF Core migration '{artifactIdentity.MigrationName}' " +
                $"was created but does not create any table. " +
                $"Expected table: '{artifactIdentity.TableName}'."
            );
        }


        if
        (
            createTableCount != 1
        )
        {
            throw new InvalidOperationException
            (
                $"EF Core migration '{artifactIdentity.MigrationName}' " +
                $"created {createTableCount} tables instead of exactly one. " +
                $"Expected entity: '{artifactIdentity.EntityName}'. " +
                $"Expected table: '{artifactIdentity.TableName}'. " +
                $"The generated model contains pending changes from other " +
                $"Code Synchronization records."
            );
        }
    }


    //===========================================================
    // Apply Migration
    //===========================================================

    public async Task
        ApplyMigrationAsync
        (
            string
                backendSolutionPath,

            string
                backendInfrastructureProjectPath,

            string
                backendStartupProjectPath
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
                "Backend solution path is required for database migration."
            );
        }


        //=======================================================
        // Validate Infrastructure Project Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                backendInfrastructureProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend infrastructure project path is required for database migration."
            );
        }


        //=======================================================
        // Validate Startup Project Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                backendStartupProjectPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend startup project path is required for database migration."
            );
        }


        //=======================================================
        // Resolve Backend Solution Directory
        //=======================================================

        string
            backendSolutionDirectory =
                ResolveWorkingDirectory
                (
                    backendSolutionPath
                );


        //=======================================================
        // Resolve Infrastructure Project
        //=======================================================

        string
            infrastructureProjectPath =
                ResolveProjectPath
                (
                    backendSolutionDirectory,

                    backendInfrastructureProjectPath
                );


        //=======================================================
        // Resolve Startup Project
        //=======================================================

        string
            startupProjectPath =
                ResolveProjectPath
                (
                    backendSolutionDirectory,

                    backendStartupProjectPath
                );


        //=======================================================
        // Validate Infrastructure Project File
        //=======================================================

        if
        (
            !File.Exists
            (
                infrastructureProjectPath
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Backend Infrastructure Project file was not found: " +
                $"{infrastructureProjectPath}"
            );
        }


        //=======================================================
        // Validate Startup Project File
        //=======================================================

        if
        (
            !File.Exists
            (
                startupProjectPath
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Backend Startup Project file was not found: " +
                $"{startupProjectPath}"
            );
        }


        //=======================================================
        // Build Backend Projects
        //=======================================================

        await BuildProjectsAsync
        (
            backendSolutionDirectory,

            infrastructureProjectPath,

            startupProjectPath
        );


        //=======================================================
        // Apply EF Core Migration
        //=======================================================

        string
            arguments =
                "ef database update " +
                "--context \"AppDbContext\" " +
                "--project " +
                $"\"{infrastructureProjectPath}\" " +
                "--startup-project " +
                $"\"{startupProjectPath}\" " +
                "--no-build";


        await ExecuteAsync
        (
            backendSolutionDirectory,

            arguments,

            "EF Core database update"
        );
    }


    //===========================================================
    // Build Backend Projects
    //===========================================================

    private static async Task
        BuildProjectsAsync
        (
            string
                backendSolutionDirectory,

            string
                infrastructureProjectPath,

            string
                startupProjectPath
        )
    {

        //=======================================================
        // Build Infrastructure Project
        //=======================================================

        string
            infrastructureBuildArguments =
                $"build " +
                $"\"{infrastructureProjectPath}\"";


        await ExecuteAsync
        (
            backendSolutionDirectory,

            infrastructureBuildArguments,

            "Backend Infrastructure Project build"
        );


        //=======================================================
        // Build Startup Project
        //=======================================================

        string
            startupBuildArguments =
                $"build " +
                $"\"{startupProjectPath}\"";


        await ExecuteAsync
        (
            backendSolutionDirectory,

            startupBuildArguments,

            "Backend Startup Project build"
        );
    }


    //===========================================================
    // Resolve Working Directory
    //===========================================================

    private static string
        ResolveWorkingDirectory
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
                string.IsNullOrWhiteSpace
                (
                    solutionDirectory
                )
            )
            {
                throw new InvalidOperationException
                (
                    $"Backend solution directory could not be resolved " +
                    $"from '{backendSolutionPath}'."
                );
            }


            return
                solutionDirectory;
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
            $"Backend solution directory was not found: " +
            $"{backendSolutionPath}"
        );
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
        // Project Path Is Absolute
        //=======================================================

        if
        (
            Path.IsPathRooted
            (
                projectPath
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


            //===================================================
            // Project Directory
            //===================================================

            if
            (
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
        }


        //=======================================================
        // Resolve Relative Project Path
        //=======================================================

        string
            relativeProjectPath =
                Path.Combine
                (
                    backendSolutionDirectory,

                    projectPath
                );


        //=======================================================
        // Relative Project File
        //=======================================================

        if
        (
            File.Exists
            (
                relativeProjectPath
            )
        )
        {
            return
                Path.GetFullPath
                (
                    relativeProjectPath
                );
        }


        //=======================================================
        // Relative Project Directory
        //=======================================================

        if
        (
            Directory.Exists
            (
                relativeProjectPath
            )
        )
        {
            return
                ResolveProjectFileFromDirectory
                (
                    relativeProjectPath
                );
        }


        //=======================================================
        // Project Name
        //=======================================================

        string
            projectDirectory =
                Path.Combine
                (
                    backendSolutionDirectory,

                    projectPath
                );


        string
            projectFilePath =
                Path.Combine
                (
                    projectDirectory,

                    $"{Path.GetFileName(projectPath)}.csproj"
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
            $"'{projectPath}' under backend solution " +
            $"'{backendSolutionDirectory}'."
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
            Path.GetFullPath
            (
                projectFiles[0]
            );
    }


    //===========================================================
    // Count Occurrences
    //===========================================================

    private static int
        CountOccurrences
        (
            string
                source,

            string
                value
        )
    {

        if
        (
            string.IsNullOrEmpty
            (
                source
            )
            ||
            string.IsNullOrEmpty
            (
                value
            )
        )
        {
            return 0;
        }


        int
            count =
                0;


        int
            index =
                0;


        while
        (
            true
        )
        {
            index =
                source.IndexOf
                (
                    value,

                    index,

                    StringComparison.Ordinal
                );


            if
            (
                index < 0
            )
            {
                break;
            }


            count++;


            index +=
                value.Length;
        }


        return
            count;
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
                $"EF Core working directory was not found: " +
                $"{workingDirectory}"
            );
        }


        //=======================================================
        // Execute First Attempt
        //=======================================================

        (
            int
                exitCode,

            string
                commandOutput
        )
            =
                await ExecuteProcessAsync
                (
                    workingDirectory,

                    arguments
                );


        //=======================================================
        // First Attempt Successful
        //=======================================================

        if
        (
            exitCode == 0
        )
        {
            return
                commandOutput;
        }


        //=======================================================
        // Wait Before Retry
        //=======================================================

        await Task.Delay
        (
            TimeSpan.FromSeconds
            (
                2
            )
        );


        //=======================================================
        // Execute Second Attempt
        //=======================================================

        (
            int
                retryExitCode,

            string
                retryCommandOutput
        )
            =
                await ExecuteProcessAsync
                (
                    workingDirectory,

                    arguments
                );


        //=======================================================
        // Second Attempt Successful
        //=======================================================

        if
        (
            retryExitCode == 0
        )
        {
            return
                retryCommandOutput;
        }


        //=======================================================
        // Resolve Error Output
        //=======================================================

        string
            firstAttemptOutput =
                !string.IsNullOrWhiteSpace
                (
                    commandOutput
                )
                ? commandOutput
                : "No output was returned by the first EF Core command attempt.";


        string
            secondAttemptOutput =
                !string.IsNullOrWhiteSpace
                (
                    retryCommandOutput
                )
                ? retryCommandOutput
                : "No output was returned by the second EF Core command attempt.";


        //=======================================================
        // Throw Command Failure
        //=======================================================

        throw new InvalidOperationException
        (
            $"{operationName} failed after two attempts. " +
            $"Command: dotnet {arguments} " +
            $"Working Directory: {workingDirectory} " +
            $"{Environment.NewLine}" +
            $"First Attempt Output:" +
            $"{Environment.NewLine}" +
            $"{firstAttemptOutput}" +
            $"{Environment.NewLine}" +
            $"Second Attempt Output:" +
            $"{Environment.NewLine}" +
            $"{secondAttemptOutput}"
        );
    }


    //===========================================================
    // Execute EF Core Process
    //===========================================================

    private static async Task
        <
            (
                int
                    ExitCode,

                string
                    CommandOutput
            )
        >
        ExecuteProcessAsync
        (
            string
                workingDirectory,

            string
                arguments
        )
    {

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
        // Return Process Result
        //=======================================================

        return
            (
                process.ExitCode,

                commandOutput
            );
    }

}