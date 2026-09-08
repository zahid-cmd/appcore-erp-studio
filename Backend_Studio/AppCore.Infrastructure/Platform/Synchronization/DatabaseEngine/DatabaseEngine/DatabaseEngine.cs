//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;

using Npgsql;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine
{

    //===========================================================
    // Database Engine
    //===========================================================

    public sealed class DatabaseEngine : IDatabaseCreationEngine
    {

        //=======================================================
        // Dependencies
        //=======================================================

        private readonly DatabaseProjectResolver
            _projectResolver;


        private readonly DatabaseCommandExecutor
            _commandExecutor;


        private readonly DatabaseValidator
            _validator;



        //=======================================================
        // Constructor
        //=======================================================

        public DatabaseEngine
        (
            DatabaseProjectResolver projectResolver,

            DatabaseCommandExecutor commandExecutor,

            DatabaseValidator validator
        )
        {
            _projectResolver =
                projectResolver;


            _commandExecutor =
                commandExecutor;


            _validator =
                validator;
        }



        //=======================================================
        // Create Database
        //=======================================================

        public async Task
            CreateAsync
        (
            long submenuId
        )
        {
            //===================================================
            // Validate Synchronization ID
            //===================================================

            _validator.ValidateSynchronizationId
            (
                submenuId
            );


            //===================================================
            // Resolve Database Project
            //===================================================

            var project =
                await _projectResolver
                    .ResolveAsync
                    (
                        CancellationToken.None
                    );


            //===================================================
            // Validate Database Project
            //===================================================

            _validator.ValidateProject
            (
                project
            );


            //===================================================
            // Locate Dedicated Migration
            //===================================================

            var migrationFile =
                FindMigration
                (
                    project.MigrationsPath,

                    submenuId
                );


            //===================================================
            // Validate Migration
            //===================================================

            _validator.ValidateMigration
            (
                migrationFile,

                submenuId
            );


            //===================================================
            // Get Migration Name
            //===================================================

            var migrationName =
                Path.GetFileNameWithoutExtension
                (
                    migrationFile
                );


            //===================================================
            // Resolve Database Connection String
            //===================================================

            var connectionString =
                await ResolveConnectionStringAsync
                (
                    project
                );


            //===================================================
            // Check Specific Migration History
            //===================================================

            var migrationAlreadyApplied =
                await IsMigrationAppliedAsync
                (
                    connectionString,

                    migrationName
                );


            //===================================================
            // Migration Already Applied
            //===================================================

            if
            (
                migrationAlreadyApplied
            )
            {
                //================================================
                // Nothing Exists To Create
                //================================================

                return;
            }


            //===================================================
            // Create Temporary SQL File
            //===================================================

            var scriptFile =
                Path.Combine
                (
                    Path.GetTempPath(),

                    $"AppCore_{submenuId}_{Guid.NewGuid():N}.sql"
                );


            try
            {
                //===============================================
                // Build Specific Migration Script Command
                //===============================================

                var scriptArguments =
                    BuildMigrationScriptArguments
                    (
                        project,

                        migrationFile,

                        migrationName,

                        scriptFile
                    );


                //===============================================
                // Generate Specific Migration SQL
                //===============================================

                await _commandExecutor
                    .ExecuteAsync
                    (
                        "dotnet",

                        scriptArguments,

                        project.InfrastructureProject,

                        CancellationToken.None
                    );


                //===============================================
                // Validate Generated SQL File
                //===============================================

                if
                (
                    !File.Exists
                    (
                        scriptFile
                    )
                )
                {
                    throw new InvalidOperationException
                    (
                        $"EF Core did not generate the migration SQL file for migration '{migrationName}'."
                    );
                }


                //===============================================
                // Read Generated Migration SQL
                //===============================================

                var migrationSql =
                    await File.ReadAllTextAsync
                    (
                        scriptFile,

                        CancellationToken.None
                    );


                //===============================================
                // Validate Generated SQL
                //===============================================

                if
                (
                    string.IsNullOrWhiteSpace
                    (
                        migrationSql
                    )
                )
                {
                    throw new InvalidOperationException
                    (
                        $"No SQL was generated for migration '{migrationName}'."
                    );
                }


                //===============================================
                // Execute Specific Migration SQL
                //===============================================

                await _commandExecutor
                    .ExecuteSqlAsync
                    (
                        connectionString,

                        migrationSql,

                        CancellationToken.None
                    );
            }
            finally
            {
                //================================================
                // Remove Temporary SQL File
                //================================================

                if
                (
                    File.Exists
                    (
                        scriptFile
                    )
                )
                {
                    try
                    {
                        File.Delete
                        (
                            scriptFile
                        );
                    }
                    catch
                    {
                        //========================================
                        // Ignore Temporary File Cleanup Failure
                        //========================================
                    }
                }
            }
        }



        //=======================================================
        // Remove Database
        //=======================================================

        public async Task
            RemoveAsync
        (
            long submenuId
        )
        {
            //===================================================
            // Validate Synchronization ID
            //===================================================

            _validator.ValidateSynchronizationId
            (
                submenuId
            );


            //===================================================
            // Resolve Database Project
            //===================================================

            var project =
                await _projectResolver
                    .ResolveAsync
                    (
                        CancellationToken.None
                    );


            //===================================================
            // Validate Database Project
            //===================================================

            _validator.ValidateProject
            (
                project
            );


            //===================================================
            // Locate Dedicated Migration
            //===================================================

            var migrationFile =
                FindMigration
                (
                    project.MigrationsPath,

                    submenuId
                );


            //===================================================
            // No Migration Found
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace
                (
                    migrationFile
                )
            )
            {
                //================================================
                // Nothing Exists To Remove
                //================================================

                return;
            }


            //===================================================
            // Validate Migration
            //===================================================

            _validator.ValidateMigration
            (
                migrationFile,

                submenuId
            );


            //===================================================
            // Get Migration Name
            //===================================================

            var migrationName =
                Path.GetFileNameWithoutExtension
                (
                    migrationFile
                );


            //===================================================
            // Resolve Database Connection String
            //===================================================

            var connectionString =
                await ResolveConnectionStringAsync
                (
                    project
                );


            //===================================================
            // Check Specific Migration History
            //===================================================

            var migrationAlreadyApplied =
                await IsMigrationAppliedAsync
                (
                    connectionString,

                    migrationName
                );


            //===================================================
            // Migration Not Applied
            //===================================================

            if
            (
                !migrationAlreadyApplied
            )
            {
                //================================================
                // Nothing Exists To Remove
                //================================================

                return;
            }


            //===================================================
            // Read Specific Migration
            //===================================================

            var migrationContent =
                await File.ReadAllTextAsync
                (
                    migrationFile,

                    CancellationToken.None
                );


            //===================================================
            // Extract Down Operations
            //===================================================

            var downOperations =
                ExtractDownOperations
                (
                    migrationContent
                );


            //===================================================
            // No Removable Database Operations
            //===================================================

            if
            (
                downOperations.Count == 0
            )
            {
                //================================================
                // Remove Specific Migration History Record
                //================================================

                await RemoveMigrationHistoryAsync
                (
                    connectionString,

                    migrationName
                );

                return;
            }


            //===================================================
            // Execute Specific Migration Removal
            //===================================================

            await ExecuteSpecificMigrationRemovalAsync
            (
                connectionString,

                downOperations
            );


            //===================================================
            // Remove Specific Migration History Record
            //===================================================

            await RemoveMigrationHistoryAsync
            (
                connectionString,

                migrationName
            );
        }



        //=======================================================
        // Build Migration Script Arguments
        //=======================================================

        private static string
            BuildMigrationScriptArguments
        (
            DatabaseProject project,

            string migrationFile,

            string migrationName,

            string scriptFile
        )
        {
            //===================================================
            // Resolve Migration Parent
            //===================================================

            var migrationParent =
                FindMigrationParent
                (
                    project.MigrationsPath,

                    migrationFile
                );


            //===================================================
            // Previous Migration Exists
            //===================================================

            if
            (
                !string.IsNullOrWhiteSpace
                (
                    migrationParent
                )
            )
            {
                return
                    $"ef migrations script " +
                    $"\"{EscapeCommandArgument(migrationParent)}\" " +
                    $"\"{EscapeCommandArgument(migrationName)}\" " +
                    $"--project \"{EscapeCommandArgument(project.InfrastructureProjectFile)}\" " +
                    $"--startup-project \"{EscapeCommandArgument(project.ApiProjectFile)}\" " +
                    $"--no-transactions " +
                    $"--output \"{EscapeCommandArgument(scriptFile)}\"";
            }


            //===================================================
            // No Migration Parent
            //===================================================

            return
                $"ef migrations script " +
                $"0 " +
                $"\"{EscapeCommandArgument(migrationName)}\" " +
                $"--project \"{EscapeCommandArgument(project.InfrastructureProjectFile)}\" " +
                $"--startup-project \"{EscapeCommandArgument(project.ApiProjectFile)}\" " +
                $"--no-transactions " +
                $"--output \"{EscapeCommandArgument(scriptFile)}\"";
        }



        //=======================================================
        // Check Specific Migration History
        //=======================================================

        private static async Task<bool>
            IsMigrationAppliedAsync
        (
            string connectionString,

            string migrationName
        )
        {
            //===================================================
            // Open Database Connection
            //===================================================

            await using var connection =
                new NpgsqlConnection
                (
                    connectionString
                );


            await connection.OpenAsync
            (
                CancellationToken.None
            );


            //===================================================
            // SQL Command
            //===================================================

            var sql =
                "SELECT EXISTS " +
                "( " +
                "SELECT 1 " +
                "FROM \"__EFMigrationsHistory\" " +
                "WHERE \"MigrationId\" = @migrationId" +
                ");";


            //===================================================
            // Create SQL Command
            //===================================================

            await using var command =
                new NpgsqlCommand
                (
                    sql,

                    connection
                );


            command.Parameters.AddWithValue
            (
                "migrationId",

                migrationName
            );


            try
            {
                //===============================================
                // Execute Scalar Query
                //===============================================

                var result =
                    await command
                        .ExecuteScalarAsync
                        (
                            CancellationToken.None
                        );


                //===============================================
                // Return Migration State
                //===============================================

                return
                    result is bool value
                    &&
                    value;
            }
            catch
            (
                PostgresException exception
            )
            {
                //===============================================
                // Migration History Table Does Not Exist
                //===============================================

                if
                (
                    exception.SqlState == "42P01"
                )
                {
                    return false;
                }


                //===============================================
                // Re-throw Other Database Errors
                //===============================================

                throw;
            }
        }



        //=======================================================
        // Find Migration Parent
        //=======================================================

        private static string?
            FindMigrationParent
        (
            string migrationsPath,

            string migrationFile
        )
        {
            var migrations =
                GetMigrations
                (
                    migrationsPath
                );


            //===================================================
            // Current Migration Index
            //===================================================

            var currentIndex =
                migrations.FindIndex
                (
                    file =>
                        string.Equals
                        (
                            Path.GetFullPath(file),

                            Path.GetFullPath(migrationFile),

                            StringComparison.OrdinalIgnoreCase
                        )
                );


            //===================================================
            // No Parent Migration
            //===================================================

            if
            (
                currentIndex <= 0
            )
            {
                return null;
            }


            //===================================================
            // Return Parent Migration
            //===================================================

            return
                Path.GetFileNameWithoutExtension
                (
                    migrations[currentIndex - 1]
                );
        }



        //=======================================================
        // Get Migrations
        //=======================================================

        private static List<string>
            GetMigrations
        (
            string migrationsPath
        )
        {
            return
                Directory.GetFiles
                (
                    migrationsPath,

                    "*.cs",

                    SearchOption.TopDirectoryOnly
                )
                .Where
                (
                    file =>
                        !file.EndsWith
                        (
                            ".Designer.cs",

                            StringComparison.OrdinalIgnoreCase
                        )
                        &&
                        !Path.GetFileName
                        (
                            file
                        )
                        .Equals
                        (
                            "AppDbContextModelSnapshot.cs",

                            StringComparison.OrdinalIgnoreCase
                        )
                )
                .OrderBy
                (
                    file =>
                        Path.GetFileNameWithoutExtension
                        (
                            file
                        ),
                    StringComparer.OrdinalIgnoreCase
                )
                .ToList();
        }



        //=======================================================
        // Resolve Connection String
        //=======================================================

        private static async Task<string>
            ResolveConnectionStringAsync
        (
            DatabaseProject project
        )
        {
            //===================================================
            // Resolve API Project Directory
            //===================================================

            var apiProjectDirectory =
                project.ApiProject;


            //===================================================
            // Resolve App Settings File
            //===================================================

            var environmentName =
                Environment.GetEnvironmentVariable
                (
                    "ASPNETCORE_ENVIRONMENT"
                );


            var configurationFiles =
                new List<string>
                {
                    Path.Combine
                    (
                        apiProjectDirectory,

                        "appsettings.json"
                    )
                };


            if
            (
                !string.IsNullOrWhiteSpace
                (
                    environmentName
                )
            )
            {
                configurationFiles.Insert
                (
                    0,

                    Path.Combine
                    (
                        apiProjectDirectory,

                        $"appsettings.{environmentName}.json"
                    )
                );
            }


            //===================================================
            // Read Connection String
            //===================================================

            foreach
            (
                var configurationFile in configurationFiles
            )
            {
                if
                (
                    !File.Exists
                    (
                        configurationFile
                    )
                )
                {
                    continue;
                }


                var json =
                    await File.ReadAllTextAsync
                    (
                        configurationFile,

                        CancellationToken.None
                    );


                using var document =
                    JsonDocument.Parse
                    (
                        json
                    );


                if
                (
                    !document.RootElement.TryGetProperty
                    (
                        "ConnectionStrings",

                        out var connectionStrings
                    )
                )
                {
                    continue;
                }


                if
                (
                    connectionStrings.TryGetProperty
                    (
                        "DefaultConnection",

                        out var defaultConnection
                    )
                )
                {
                    var value =
                        defaultConnection.GetString();


                    if
                    (
                        !string.IsNullOrWhiteSpace
                        (
                            value
                        )
                    )
                    {
                        return value;
                    }
                }
            }


            //===================================================
            // Resolve Environment Connection String
            //===================================================

            var environmentConnectionString =
                Environment.GetEnvironmentVariable
                (
                    "ConnectionStrings__DefaultConnection"
                );


            if
            (
                !string.IsNullOrWhiteSpace
                (
                    environmentConnectionString
                )
            )
            {
                return environmentConnectionString;
            }


            //===================================================
            // Connection String Not Found
            //===================================================

            throw new InvalidOperationException
            (
                $"No DefaultConnection string could be resolved from the API project '{apiProjectDirectory}'."
            );
        }



        //=======================================================
        // Extract Down Operations
        //=======================================================

        private static List<string>
            ExtractDownOperations
        (
            string migrationContent
        )
        {
            var operations =
                new List<string>();


            //===================================================
            // Locate Down Method
            //===================================================

            var downMatch =
                Regex.Match
                (
                    migrationContent,

                    @"protected\s+override\s+void\s+Down\s*\([^)]*\)\s*\{(?<body>[\s\S]*?)\n\s*\}",

                    RegexOptions.IgnoreCase
                );


            if
            (
                !downMatch.Success
            )
            {
                return operations;
            }


            var downBody =
                downMatch.Groups["body"].Value;


            //===================================================
            // Extract DropTable Operations
            //===================================================

            var dropTableMatches =
                Regex.Matches
                (
                    downBody,

                    @"migrationBuilder\.DropTable\s*\(\s*name\s*:\s*""(?<name>[^""]+)""",

                    RegexOptions.IgnoreCase
                );


            foreach
            (
                Match match in dropTableMatches
            )
            {
                var tableName =
                    match.Groups["name"].Value;


                if
                (
                    !string.IsNullOrWhiteSpace
                    (
                        tableName
                    )
                )
                {
                    operations.Add
                    (
                        BuildDropTableSql
                        (
                            tableName
                        )
                    );
                }
            }


            //===================================================
            // Extract DropColumn Operations
            //===================================================

            var dropColumnMatches =
                Regex.Matches
                (
                    downBody,

                    @"migrationBuilder\.DropColumn\s*\(\s*name\s*:\s*""(?<column>[^""]+)""\s*,\s*table\s*:\s*""(?<table>[^""]+)""",

                    RegexOptions.IgnoreCase
                );


            foreach
            (
                Match match in dropColumnMatches
            )
            {
                var columnName =
                    match.Groups["column"].Value;


                var tableName =
                    match.Groups["table"].Value;


                if
                (
                    !string.IsNullOrWhiteSpace
                    (
                        columnName
                    )
                    &&
                    !string.IsNullOrWhiteSpace
                    (
                        tableName
                    )
                )
                {
                    operations.Add
                    (
                        BuildDropColumnSql
                        (
                            tableName,

                            columnName
                        )
                    );
                }
            }


            //===================================================
            // Extract DropIndex Operations
            //===================================================

            var dropIndexMatches =
                Regex.Matches
                (
                    downBody,

                    @"migrationBuilder\.DropIndex\s*\(\s*name\s*:\s*""(?<index>[^""]+)""\s*,\s*table\s*:\s*""(?<table>[^""]+)""",

                    RegexOptions.IgnoreCase
                );


            foreach
            (
                Match match in dropIndexMatches
            )
            {
                var indexName =
                    match.Groups["index"].Value;


                if
                (
                    !string.IsNullOrWhiteSpace
                    (
                        indexName
                    )
                )
                {
                    operations.Add
                    (
                        BuildDropIndexSql
                        (
                            indexName
                        )
                    );
                }
            }


            return operations;
        }



        //=======================================================
        // Execute Specific Migration Removal
        //=======================================================

        private async Task
            ExecuteSpecificMigrationRemovalAsync
        (
            string connectionString,

            List<string> operations
        )
        {
            //===================================================
            // Execute Every Operation Independently
            //===================================================

            foreach
            (
                var sql in operations
            )
            {
                await _commandExecutor
                    .ExecuteSqlAsync
                    (
                        connectionString,

                        sql,

                        CancellationToken.None
                    );
            }
        }



        //=======================================================
        // Remove Migration History
        //=======================================================

        private async Task
            RemoveMigrationHistoryAsync
        (
            string connectionString,

            string migrationName
        )
        {
            //===================================================
            // Build SQL
            //===================================================

            var sql =
                $"DELETE FROM \"__EFMigrationsHistory\" " +
                $"WHERE \"MigrationId\" = '{EscapeSqlLiteral(migrationName)}';";


            //===================================================
            // Execute History Removal
            //===================================================

            await _commandExecutor
                .ExecuteSqlAsync
                (
                    connectionString,

                    sql,

                    CancellationToken.None
                );
        }



        //=======================================================
        // Build Drop Table SQL
        //=======================================================

        private static string
            BuildDropTableSql
        (
            string tableName
        )
        {
            return
                $"DROP TABLE IF EXISTS \"{EscapeIdentifier(tableName)}\" CASCADE;";
        }



        //=======================================================
        // Build Drop Column SQL
        //=======================================================

        private static string
            BuildDropColumnSql
        (
            string tableName,

            string columnName
        )
        {
            return
                $"ALTER TABLE IF EXISTS \"{EscapeIdentifier(tableName)}\" " +
                $"DROP COLUMN IF EXISTS \"{EscapeIdentifier(columnName)}\";";
        }



        //=======================================================
        // Build Drop Index SQL
        //=======================================================

        private static string
            BuildDropIndexSql
        (
            string indexName
        )
        {
            return
                $"DROP INDEX IF EXISTS \"{EscapeIdentifier(indexName)}\";";
        }



        //=======================================================
        // Escape Identifier
        //=======================================================

        private static string
            EscapeIdentifier
        (
            string value
        )
        {
            return value.Replace
            (
                "\"",

                "\"\""
            );
        }



        //=======================================================
        // Escape SQL Literal
        //=======================================================

        private static string
            EscapeSqlLiteral
        (
            string value
        )
        {
            return value.Replace
            (
                "'",

                "''"
            );
        }



        //=======================================================
        // Escape Command Argument
        //=======================================================

        private static string
            EscapeCommandArgument
        (
            string value
        )
        {
            return value
                .Replace
                (
                    "\\",

                    "\\\\"
                )
                .Replace
                (
                    "\"",

                    "\\\""
                );
        }



        //=======================================================
        // Find Migration
        //=======================================================

        private static string
            FindMigration
        (
            string migrationsPath,

            long submenuId
        )
        {
            var migrations =
                Directory.GetFiles
                (
                    migrationsPath,

                    $"*AutoSync_{submenuId}_*.cs",

                    SearchOption.TopDirectoryOnly
                )
                .Where
                (
                    file =>
                        !file.EndsWith
                        (
                            ".Designer.cs",

                            StringComparison.OrdinalIgnoreCase
                        )
                )
                .ToArray();


            if
            (
                migrations.Length == 0
            )
            {
                return
                    string.Empty;
            }


            if
            (
                migrations.Length > 1
            )
            {
                throw new InvalidOperationException
                (
                    $"Multiple migrations exist for Submenu ID {submenuId}."
                );
            }


            return migrations[0];
        }
    }
}