//===============================================================
// Namespaces
//===============================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;
using AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendDatabaseEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.BackendDatabaseEngine;


//===============================================================
// Backend Database Engine
//===============================================================

public class BackendDatabaseEngine
    : IBackendDatabaseEngine
{

    //===========================================================
    // Create Database
    //===========================================================

    public async Task<BackendDatabaseResultDto>
        CreateAsync
        (
            long codeSynchronizationId
        )
    {
        var result =
            new BackendDatabaseResultDto();


        try
        {
            //===================================================
            // Locate Backend Root
            //===================================================

            var backendRoot =
                GetBackendRoot();


            if
            (
                string.IsNullOrWhiteSpace
                (
                    backendRoot
                )
            )
            {
                result.Success =
                    false;

                result.Message =
                    "Backend solution directory was not found.";

                return result;
            }


            //===================================================
            // Migration Name
            //===================================================

            var migrationName =
                $"BackendDatabase_Create_{codeSynchronizationId}";


            //===================================================
            // Find Existing Migration
            //===================================================

            var migrationFile =
                FindMigrationFile
                (
                    backendRoot,
                    migrationName
                );


            //===================================================
            // Create Migration
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace
                (
                    migrationFile
                )
            )
            {
                var migrationResult =
                    await ExecuteCommandAsync
                    (
                        backendRoot,

                        "dotnet",

                        $"ef migrations add {migrationName} " +
                        "--project AppCore.Infrastructure " +
                        "--startup-project AppCore.API"
                    );


                if
                (
                    !migrationResult.Success
                )
                {
                    result.Success =
                        false;

                    result.Message =
                        migrationResult.Message;

                    return result;
                }


                migrationFile =
                    FindMigrationFile
                    (
                        backendRoot,
                        migrationName
                    );


                if
                (
                    string.IsNullOrWhiteSpace
                    (
                        migrationFile
                    )
                )
                {
                    result.Success =
                        false;

                    result.Message =
                        "Database migration was created but could not be located.";

                    return result;
                }
            }


            //===================================================
            // Get Actual Migration Id
            //===================================================

            var migrationId =
                Path
                    .GetFileNameWithoutExtension
                    (
                        migrationFile
                    );


            //===================================================
            // Update Database To This Migration
            //===================================================

            var databaseResult =
                await ExecuteCommandAsync
                (
                    backendRoot,

                    "dotnet",

                    $"ef database update {migrationId} " +
                    "--project AppCore.Infrastructure " +
                    "--startup-project AppCore.API"
                );


            if
            (
                !databaseResult.Success
            )
            {
                result.Success =
                    false;

                result.Message =
                    databaseResult.Message;

                return result;
            }


            //===================================================
            // Success
            //===================================================

            result.Success =
                true;

            result.Message =
                "Database created successfully.";

            result.MigrationName =
                migrationId;

            result.Created =
                true;


            return result;
        }
        catch
        (
            Exception exception
        )
        {
            result.Success =
                false;

            result.Message =
                exception.Message;

            return result;
        }
    }



    //===========================================================
    // Remove Database
    //===========================================================

    public async Task<BackendDatabaseResultDto>
        RemoveAsync
        (
            long codeSynchronizationId
        )
    {
        var result =
            new BackendDatabaseResultDto();


        try
        {
            //===================================================
            // Locate Backend Root
            //===================================================

            var backendRoot =
                GetBackendRoot();


            if
            (
                string.IsNullOrWhiteSpace
                (
                    backendRoot
                )
            )
            {
                result.Success =
                    false;

                result.Message =
                    "Backend solution directory was not found.";

                return result;
            }


            //===================================================
            // Migration Name
            //===================================================

            var migrationName =
                $"BackendDatabase_Create_{codeSynchronizationId}";


            //===================================================
            // Find Migration
            //===================================================

            var migrationFile =
                FindMigrationFile
                (
                    backendRoot,
                    migrationName
                );


            if
            (
                string.IsNullOrWhiteSpace
                (
                    migrationFile
                )
            )
            {
                result.Success =
                    false;

                result.Message =
                    "Database migration was not found.";

                return result;
            }


            //===================================================
            // Get Migration Files
            //===================================================

            var migrationFiles =
                GetMigrationFiles
                (
                    backendRoot
                );


            var migrationIndex =
                Array.IndexOf
                (
                    migrationFiles,
                    migrationFile
                );


            if
            (
                migrationIndex
                <
                0
            )
            {
                result.Success =
                    false;

                result.Message =
                    "Database migration was not found.";

                return result;
            }


            //===================================================
            // Validate Latest Migration
            //===================================================

            if
            (
                migrationIndex
                !=
                migrationFiles.Length
                -
                1
            )
            {
                result.Success =
                    false;

                result.Message =
                    "Only the latest database migration can be removed.";

                return result;
            }


            //===================================================
            // Previous Migration
            //===================================================

            var previousMigration =
                "0";


            if
            (
                migrationIndex
                >
                0
            )
            {
                previousMigration =
                    Path
                        .GetFileNameWithoutExtension
                        (
                            migrationFiles
                                [migrationIndex - 1]
                        );
            }


            //===================================================
            // Revert Database
            //===================================================

            var databaseResult =
                await ExecuteCommandAsync
                (
                    backendRoot,

                    "dotnet",

                    $"ef database update {previousMigration} " +
                    "--project AppCore.Infrastructure " +
                    "--startup-project AppCore.API"
                );


            if
            (
                !databaseResult.Success
            )
            {
                result.Success =
                    false;

                result.Message =
                    databaseResult.Message;

                return result;
            }


            //===================================================
            // Remove Migration
            //===================================================

            var migrationResult =
                await ExecuteCommandAsync
                (
                    backendRoot,

                    "dotnet",

                    "ef migrations remove " +
                    "--project AppCore.Infrastructure " +
                    "--startup-project AppCore.API"
                );


            if
            (
                !migrationResult.Success
            )
            {
                result.Success =
                    false;

                result.Message =
                    migrationResult.Message;

                return result;
            }


            //===================================================
            // Success
            //===================================================

            result.Success =
                true;

            result.Message =
                "Database removed successfully.";

            result.MigrationName =
                migrationName;

            result.Removed =
                true;


            return result;
        }
        catch
        (
            Exception exception
        )
        {
            result.Success =
                false;

            result.Message =
                exception.Message;

            return result;
        }
    }



    //===========================================================
    // Find Migration File
    //===========================================================

    private static string
        FindMigrationFile
        (
            string backendRoot,

            string migrationName
        )
    {
        var migrationFiles =
            GetMigrationFiles
            (
                backendRoot
            );


        return
            migrationFiles
                .FirstOrDefault
                (
                    file =>
                        Path
                            .GetFileNameWithoutExtension
                            (
                                file
                            )
                            .Contains
                            (
                                migrationName,
                                StringComparison.OrdinalIgnoreCase
                            )
                )
            ??
            string.Empty;
    }



    //===========================================================
    // Get Migration Files
    //===========================================================

    private static string[]
        GetMigrationFiles
        (
            string backendRoot
        )
    {
        var migrationsPath =
            Path.Combine
            (
                backendRoot,
                "AppCore.Infrastructure",
                "Migrations"
            );


        if
        (
            !Directory.Exists
            (
                migrationsPath
            )
        )
        {
            return
                [];
        }


        return
            Directory
                .GetFiles
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

                        Path
                            .GetFileNameWithoutExtension
                            (
                                file
                            )
                            .Contains
                            (
                                "_",
                                StringComparison.Ordinal
                            )
                )
                .OrderBy
                (
                    file =>
                        Path.GetFileName
                        (
                            file
                        )
                )
                .ToArray();
    }



    //===========================================================
    // Get Backend Root
    //===========================================================

    private static string
        GetBackendRoot()
    {
        var directory =
            new DirectoryInfo
            (
                Environment.CurrentDirectory
            );


        while
        (
            directory
            !=
            null
        )
        {
            var infrastructurePath =
                Path.Combine
                (
                    directory.FullName,
                    "AppCore.Infrastructure"
                );


            var apiPath =
                Path.Combine
                (
                    directory.FullName,
                    "AppCore.API"
                );


            if
            (
                Directory.Exists
                (
                    infrastructurePath
                )

                &&

                Directory.Exists
                (
                    apiPath
                )
            )
            {
                return
                    directory.FullName;
            }


            directory =
                directory.Parent;
        }


        return
            string.Empty;
    }



    //===========================================================
    // Execute Command
    //===========================================================

    private static async Task
        <(bool Success, string Message)>
        ExecuteCommandAsync
        (
            string workingDirectory,

            string fileName,

            string arguments
        )
    {
        var processStartInfo =
            new ProcessStartInfo
            {
                FileName =
                    fileName,

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


        using var process =
            new Process
            {
                StartInfo =
                    processStartInfo
            };


        process.Start();


        var outputTask =
            process
                .StandardOutput
                .ReadToEndAsync();


        var errorTask =
            process
                .StandardError
                .ReadToEndAsync();


        await process.WaitForExitAsync();


        var output =
            await outputTask;


        var error =
            await errorTask;


        if
        (
            process.ExitCode
            ==
            0
        )
        {
            return
            (
                true,
                output
            );
        }


        return
        (
            false,

            string.IsNullOrWhiteSpace
            (
                error
            )
                ? output
                : error
        );
    }

}