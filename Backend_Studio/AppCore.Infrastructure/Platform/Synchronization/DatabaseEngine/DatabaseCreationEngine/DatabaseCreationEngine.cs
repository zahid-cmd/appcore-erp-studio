//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;

using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;

using AppCore.Infrastructure.Persistence;

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine;


//===============================================================
// Database Creation Engine
//===============================================================

public class DatabaseCreationEngine
    : IDatabaseCreationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _dbContext;


    private readonly ICodeSynchronizationRepository
        _codeSynchronizationRepository;


    private readonly DatabaseArtifactHelper
        _databaseArtifactHelper;


    private readonly DatabaseMigrationHelper
        _databaseMigrationHelper;



    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseCreationEngine
    (
        AppDbContext dbContext,

        ICodeSynchronizationRepository
            codeSynchronizationRepository,

        DatabaseArtifactHelper
            databaseArtifactHelper,

        DatabaseMigrationHelper
            databaseMigrationHelper
    )
    {
        _dbContext =
            dbContext;


        _codeSynchronizationRepository =
            codeSynchronizationRepository;


        _databaseArtifactHelper =
            databaseArtifactHelper;


        _databaseMigrationHelper =
            databaseMigrationHelper;
    }



    //===========================================================
    // Create Database
    //===========================================================

    public async Task CreateDatabaseAsync
    (
        long codeSynchronizationId
    )
    {
        //=======================================================
        // Validate Code Synchronization Id
        //=======================================================

        if
        (
            codeSynchronizationId <= 0
        )
        {
            throw new ArgumentException
            (
                "A valid Code Synchronization Id is required.",

                nameof(
                    codeSynchronizationId
                )
            );
        }


        //=======================================================
        // Load Code Synchronization
        //=======================================================

        var codeSynchronization =
            await _codeSynchronizationRepository
                .GetByIdAsync
                (
                    codeSynchronizationId
                );


        if
        (
            codeSynchronization is null
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization record '{codeSynchronizationId}' could not be located."
            );
        }


        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                codeSynchronization.SubmenuCode
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization record '{codeSynchronizationId}' does not contain a valid Submenu Code."
            );
        }


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var submenuSynchronization =
            await _codeSynchronizationRepository
                .GetSubmenuSynchronizationForRegistrationAsync
                (
                    codeSynchronization
                        .SubmenuSynchronizationId
                );


        if
        (
            submenuSynchronization is null
        )
        {
            throw new InvalidOperationException
            (
                $"Submenu Synchronization record '{codeSynchronization.SubmenuSynchronizationId}' could not be located."
            );
        }


        //=======================================================
        // Validate Submenu Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.SubmenuName
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Submenu Synchronization record '{codeSynchronization.SubmenuSynchronizationId}' does not contain a valid Submenu Name."
            );
        }


        //=======================================================
        // Find Backend Studio Root
        //=======================================================

        var backendStudioRoot =
            FindBackendStudioRoot();


        if
        (
            backendStudioRoot is null
        )
        {
            throw new InvalidOperationException
            (
                "Backend Studio root could not be located."
            );
        }


        //=======================================================
        // Find Infrastructure Project
        //=======================================================

        var infrastructureProject =
            FindProject
            (
                backendStudioRoot,

                "AppCore.Infrastructure"
            );


        if
        (
            infrastructureProject is null
        )
        {
            throw new InvalidOperationException
            (
                "AppCore.Infrastructure project could not be located."
            );
        }


        //=======================================================
        // Find API Project
        //=======================================================

        var apiProject =
            FindProject
            (
                backendStudioRoot,

                "AppCore.API"
            );


        if
        (
            apiProject is null
        )
        {
            throw new InvalidOperationException
            (
                "AppCore.API project could not be located."
            );
        }


        //=======================================================
        // Find Migrations Directory
        //=======================================================

        var migrationsDirectory =
            FindMigrationsDirectory
            (
                infrastructureProject
            );


        if
        (
            migrationsDirectory is null
        )
        {
            throw new InvalidOperationException
            (
                "Database migrations directory could not be located."
            );
        }


        //=======================================================
        // Build Backend Projects
        //=======================================================

        var buildResult =
            await RunDotnetProcessAsync
            (
                new[]
                {
                    "build",

                    apiProject
                },

                backendStudioRoot
            );


        //=======================================================
        // Backend Build Failed
        //=======================================================

        if
        (
            buildResult.ExitCode != 0
        )
        {
            throw new InvalidOperationException
            (
                $"Backend build failed.{Environment.NewLine}{GetProcessOutput(buildResult)}"
            );
        }


        //=======================================================
        // Build Database Artifact Information
        //=======================================================

        var artifact =
            _databaseArtifactHelper
                .BuildArtifactInfo
                (
                    codeSynchronization
                        .SubmenuCode,

                    "public",

                    submenuSynchronization
                        .SubmenuName
                );


        //=======================================================
        // Find Existing Migration
        //=======================================================

        var migration =
            _databaseMigrationHelper
                .FindMigrationInfo
                (
                    migrationsDirectory,

                    artifact
                        .Migration
                        .MigrationName
                );


        artifact.Migration =
            migration;


        //=======================================================
        // Validate Existing Migration Artifacts
        //=======================================================

        var migrationAlreadyExists =
            _databaseMigrationHelper
                .MigrationExists
                (
                    migration
                );


        if
        (
            migrationAlreadyExists
            &&
            !_databaseMigrationHelper
                .CompleteMigrationArtifactsExist
                (
                    migration
                )
        )
        {
            throw new InvalidOperationException
            (
                $"Database migration '{migration.MigrationName}' exists but its generated artifacts are incomplete."
            );
        }


        //=======================================================
        // Validate Existing Migration Ownership
        //=======================================================

        if
        (
            migrationAlreadyExists
            &&
            !MigrationCreatesOnlyExpectedTable
            (
                migration,

                artifact.Table.TableName
            )
        )
        {
            throw new InvalidOperationException
            (
                BuildMigrationOwnershipErrorMessage
                (
                    migration,

                    artifact.Table.Schema,

                    artifact.Table.TableName
                )
            );
        }


        //=======================================================
        // Verify Database Table
        //=======================================================

        var tableExists =
            await DatabaseTableExistsAsync
            (
                artifact.Table.Schema,

                artifact.Table.TableName
            );


        artifact.Table.TableExists =
            tableExists;


        //=======================================================
        // Existing Table Without Migration
        //=======================================================

        if
        (
            artifact.Table.TableExists
            &&
            !migrationAlreadyExists
        )
        {
            throw new InvalidOperationException
            (
                $"Database table '{artifact.Table.Schema}.{artifact.Table.TableName}' already exists, but no owned migration artifact was found."
            );
        }


        //=======================================================
        // Existing Migration And Existing Table
        //=======================================================

        if
        (
            migrationAlreadyExists
            &&
            artifact.Table.TableExists
        )
        {
            await _codeSynchronizationRepository
                .UpdateBackendRegistrationStatusAsync
                (
                    codeSynchronizationId,

                    true,

                    $"Database table '{artifact.Table.Schema}.{artifact.Table.TableName}' already exists and migration '{migration.MigrationName}' is already available."
                );


            return;
        }


        //=======================================================
        // Create Migration
        //=======================================================

        if
        (
            !migrationAlreadyExists
        )
        {
            var migrationResult =
                await RunDotnetProcessAsync
                (
                    new[]
                    {
                        "ef",

                        "migrations",

                        "add",

                        artifact
                            .Migration
                            .MigrationName,

                        "--project",

                        infrastructureProject,

                        "--startup-project",

                        apiProject
                    },

                    backendStudioRoot
                );


            //===================================================
            // Migration Creation Failed
            //===================================================

            if
            (
                migrationResult.ExitCode != 0
            )
            {
                throw new InvalidOperationException
                (
                    $"Database migration creation failed.{Environment.NewLine}{GetProcessOutput(migrationResult)}"
                );
            }


            //===================================================
            // Verify Migration Artifacts
            //===================================================

            migration =
                _databaseMigrationHelper
                    .FindMigrationInfo
                    (
                        migrationsDirectory,

                        artifact
                            .Migration
                            .MigrationName
                    );


            artifact.Migration =
                migration;


            if
            (
                !_databaseMigrationHelper
                    .CompleteMigrationArtifactsExist
                    (
                        migration
                    )
            )
            {
                throw new InvalidOperationException
                (
                    $"Database migration '{migration.MigrationName}' was created, but its generated artifacts could not be verified."
                );
            }


            //===================================================
            // Verify Migration Ownership
            //===================================================

            if
            (
                !MigrationCreatesOnlyExpectedTable
                (
                    migration,

                    artifact.Table.TableName
                )
            )
            {
                var ownershipErrorMessage =
                    BuildMigrationOwnershipErrorMessage
                    (
                        migration,

                        artifact.Table.Schema,

                        artifact.Table.TableName
                    );


                var migrationRemovalResult =
                    await RunDotnetProcessAsync
                    (
                        new[]
                        {
                            "ef",

                            "migrations",

                            "remove",

                            "--force",

                            "--project",

                            infrastructureProject,

                            "--startup-project",

                            apiProject
                        },

                        backendStudioRoot
                    );


                if
                (
                    migrationRemovalResult.ExitCode != 0
                )
                {
                    throw new InvalidOperationException
                    (
                        $"{ownershipErrorMessage}{Environment.NewLine}{Environment.NewLine}The invalid generated migration could not be removed automatically.{Environment.NewLine}{GetProcessOutput(migrationRemovalResult)}"
                    );
                }


                throw new InvalidOperationException
                (
                    $"{ownershipErrorMessage}{Environment.NewLine}{Environment.NewLine}The invalid generated migration was removed automatically."
                );
            }
        }


        //=======================================================
        // Update Database
        //=======================================================

        var databaseUpdateResult =
            await RunDotnetProcessAsync
            (
                new[]
                {
                    "ef",

                    "database",

                    "update",

                    "--project",

                    infrastructureProject,

                    "--startup-project",

                    apiProject
                },

                backendStudioRoot
            );


        //=======================================================
        // Database Update Failed
        //=======================================================

        if
        (
            databaseUpdateResult.ExitCode != 0
        )
        {
            throw new InvalidOperationException
            (
                $"Database update failed.{Environment.NewLine}{GetProcessOutput(databaseUpdateResult)}"
            );
        }


        //=======================================================
        // Verify Database Table
        //=======================================================

        tableExists =
            await DatabaseTableExistsAsync
            (
                artifact.Table.Schema,

                artifact.Table.TableName
            );


        if
        (
            !tableExists
        )
        {
            throw new InvalidOperationException
            (
                $"Database update completed, but table '{artifact.Table.Schema}.{artifact.Table.TableName}' could not be verified."
            );
        }


        //=======================================================
        // Update Registration Status
        //=======================================================

        await _codeSynchronizationRepository
            .UpdateBackendRegistrationStatusAsync
            (
                codeSynchronizationId,

                true,

                $"Database table '{artifact.Table.Schema}.{artifact.Table.TableName}' was created successfully."
            );
    }



    //===========================================================
    // Migration Creates Only Expected Table
    //===========================================================

    private static bool
        MigrationCreatesOnlyExpectedTable
    (
        DatabaseMigrationInfo migration,

        string expectedTableName
    )
    {
        var createdTables =
            GetMigrationCreatedTables
            (
                migration
            );


        return
            createdTables.Count
            ==
            1
            &&
            string.Equals
            (
                createdTables[0],

                expectedTableName,

                StringComparison.OrdinalIgnoreCase
            );
    }



    //===========================================================
    // Get Migration Created Tables
    //===========================================================

    private static List<string>
        GetMigrationCreatedTables
    (
        DatabaseMigrationInfo migration
    )
    {
        var createdTables =
            new List<string>();


        if
        (
            string.IsNullOrWhiteSpace
            (
                migration.MigrationFilePath
            )
            ||
            !File.Exists
            (
                migration.MigrationFilePath
            )
        )
        {
            return
                createdTables;
        }


        var migrationContent =
            File.ReadAllText
            (
                migration.MigrationFilePath
            );


        var createTableMatches =
            Regex.Matches
            (
                migrationContent,

                """
                migrationBuilder
                \s*
                \.
                \s*
                CreateTable
                \s*
                \(
                \s*
                name:
                \s*
                "
                (?<tableName>[^"]+)
                "
                """,

                RegexOptions.IgnorePatternWhitespace
                |
                RegexOptions.CultureInvariant
            );


        foreach
        (
            Match createTableMatch in createTableMatches
        )
        {
            var tableName =
                createTableMatch
                    .Groups
                    ["tableName"]
                    .Value;


            if
            (
                !string.IsNullOrWhiteSpace
                (
                    tableName
                )
            )
            {
                createdTables.Add
                (
                    tableName
                );
            }
        }


        return
            createdTables;
    }



    //===========================================================
    // Build Migration Ownership Error Message
    //===========================================================

    private static string
        BuildMigrationOwnershipErrorMessage
    (
        DatabaseMigrationInfo migration,

        string schema,

        string expectedTableName
    )
    {
        var createdTables =
            GetMigrationCreatedTables
            (
                migration
            );


        var createdTableNames =
            createdTables.Count
            ==
            0
                ?
                "None"
                :
                string.Join
                (
                    ", ",

                    createdTables
                );


        return
            $"Database migration '{migration.MigrationName}' does not exclusively belong to table '{schema}.{expectedTableName}'. Expected exactly one created table: '{expectedTableName}'. Generated tables: {createdTableNames}.";
    }



    //===========================================================
    // Database Table Exists
    //===========================================================

    private async Task<bool>
        DatabaseTableExistsAsync
    (
        string schema,

        string tableName
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                schema
            )
        )
        {
            throw new ArgumentException
            (
                "Database schema is required.",

                nameof(
                    schema
                )
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                tableName
            )
        )
        {
            throw new ArgumentException
            (
                "Database table name is required.",

                nameof(
                    tableName
                )
            );
        }


        var connection =
            _dbContext.Database
                .GetDbConnection();


        var connectionWasClosed =
            connection.State
            ==
            System.Data.ConnectionState.Closed;


        if
        (
            connectionWasClosed
        )
        {
            await connection.OpenAsync();
        }


        try
        {
            await using var command =
                connection.CreateCommand();


            command.CommandText =
                """
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = @schema
                  AND TABLE_NAME = @tableName
                """;


            var schemaParameter =
                command.CreateParameter();


            schemaParameter.ParameterName =
                "@schema";


            schemaParameter.Value =
                schema;


            command.Parameters.Add(
                schemaParameter
            );


            var tableParameter =
                command.CreateParameter();


            tableParameter.ParameterName =
                "@tableName";


            tableParameter.Value =
                tableName;


            command.Parameters.Add(
                tableParameter
            );


            var result =
                await command.ExecuteScalarAsync();


            return
                Convert.ToInt32(
                    result
                )
                >
                0;
        }
        finally
        {
            if
            (
                connectionWasClosed
            )
            {
                await connection.CloseAsync();
            }
        }
    }



    //===========================================================
    // Find Backend Studio Root
    //===========================================================

    private static string?
        FindBackendStudioRoot()
    {
        var directory =
            new DirectoryInfo
            (
                AppContext.BaseDirectory
            );


        while
        (
            directory is not null
        )
        {
            var infrastructureDirectory =
                Path.Combine
                (
                    directory.FullName,

                    "AppCore.Infrastructure"
                );


            if
            (
                Directory.Exists
                (
                    infrastructureDirectory
                )
            )
            {
                return
                    directory.FullName;
            }


            directory =
                directory.Parent;
        }


        return null;
    }



    //===========================================================
    // Find Project
    //===========================================================

    private static string?
        FindProject
    (
        string rootDirectory,

        string projectName
    )
    {
        var projectDirectory =
            Path.Combine
            (
                rootDirectory,

                projectName
            );


        if
        (
            !Directory.Exists
            (
                projectDirectory
            )
        )
        {
            return null;
        }


        return
            Directory
                .GetFiles
                (
                    projectDirectory,

                    $"{projectName}.csproj",

                    SearchOption.TopDirectoryOnly
                )
                .FirstOrDefault();
    }



    //===========================================================
    // Find Migrations Directory
    //===========================================================

    private static string?
        FindMigrationsDirectory
    (
        string infrastructureProject
    )
    {
        var projectDirectory =
            Path.GetDirectoryName
            (
                infrastructureProject
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                projectDirectory
            )
            ||
            !Directory.Exists
            (
                projectDirectory
            )
        )
        {
            return null;
        }


        var migrationsDirectory =
            Directory
                .GetDirectories
                (
                    projectDirectory,

                    "Migrations",

                    SearchOption.AllDirectories
                )
                .FirstOrDefault();


        return
            migrationsDirectory;
    }



    //===========================================================
    // Run Dotnet Process
    //===========================================================

    private static async Task<DotnetProcessResult>
        RunDotnetProcessAsync
    (
        IEnumerable<string> arguments,

        string workingDirectory
    )
    {
        var processStartInfo =
            new ProcessStartInfo
            {
                FileName =
                    "dotnet",

                WorkingDirectory =
                    workingDirectory,

                UseShellExecute =
                    false,

                RedirectStandardOutput =
                    true,

                RedirectStandardError =
                    true,

                CreateNoWindow =
                    true
            };


        foreach
        (
            var argument in arguments
        )
        {
            processStartInfo.ArgumentList.Add
            (
                argument
            );
        }


        using var process =
            new Process
            {
                StartInfo =
                    processStartInfo
            };


        process.Start();


        var standardOutputTask =
            process.StandardOutput
                .ReadToEndAsync();


        var standardErrorTask =
            process.StandardError
                .ReadToEndAsync();


        await process.WaitForExitAsync();


        return new DotnetProcessResult
        {
            ExitCode =
                process.ExitCode,

            StandardOutput =
                await standardOutputTask,

            StandardError =
                await standardErrorTask
        };
    }



    //===========================================================
    // Get Process Output
    //===========================================================

    private static string
        GetProcessOutput
    (
        DotnetProcessResult result
    )
    {
        var output =
            string.Empty;


        if
        (
            !string.IsNullOrWhiteSpace
            (
                result.StandardOutput
            )
        )
        {
            output +=
                result.StandardOutput;
        }


        if
        (
            !string.IsNullOrWhiteSpace
            (
                result.StandardError
            )
        )
        {
            if
            (
                !string.IsNullOrWhiteSpace
                (
                    output
                )
            )
            {
                output +=
                    Environment.NewLine;
            }


            output +=
                result.StandardError;
        }


        return output;
    }



    //===========================================================
    // Dotnet Process Result
    //===========================================================

    private sealed class DotnetProcessResult
    {

        public int ExitCode
        {
            get;
            init;
        }


        public string StandardOutput
        {
            get;
            init;
        }
        =
            string.Empty;


        public string StandardError
        {
            get;
            init;
        }
        =
            string.Empty;

    }

}