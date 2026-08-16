//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendRegistrationEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.BackendRegistrationEngine;


//===============================================================
// Backend Registration Engine
//===============================================================

public class BackendRegistrationEngine
    : IBackendRegistrationEngine
{

    //===========================================================
    // Register
    //===========================================================

    public async Task<BackendRegistrationResultDto>
        RegisterAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        try
        {
            //===================================================
            // Validate
            //===================================================

            if
            (
                synchronization == null
            )
            {
                return Failure(
                    "Submenu Synchronization data is required."
                );
            }


            //===================================================
            // Find Backend Studio
            //===================================================

            var backendStudioRoot =
                FindBackendStudioRoot(
                    synchronization.BackendSubMenuEntityFile
                );


            if
            (
                backendStudioRoot is null
            )
            {
                return Failure(
                    "Backend registration failed: Backend_Studio root could not be located."
                );
            }


            //===================================================
            // Build Names
            //===================================================

            var entityName =
                ToPascalCase(
                    synchronization.SubmenuName
                    ??
                    string.Empty
                );


            var moduleName =
                ToPascalCase(
                    synchronization.ModuleName
                    ??
                    string.Empty
                );


            var menuName =
                ToPascalCase(
                    synchronization.MenuName
                    ??
                    string.Empty
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    entityName
                )
            )
            {
                return Failure(
                    "Backend registration failed: Entity name is required."
                );
            }


            //===================================================
            // Paths
            //===================================================

            var infrastructureProject =
                Path.Combine(
                    backendStudioRoot,

                    "AppCore.Infrastructure",

                    "AppCore.Infrastructure.csproj"
                );


            var apiProject =
                Path.Combine(
                    backendStudioRoot,

                    "AppCore.API",

                    "AppCore.API.csproj"
                );


            var dbContextFile =
                Path.Combine(
                    backendStudioRoot,

                    "AppCore.Infrastructure",

                    "Persistence",

                    "AppDbContext.cs"
                );


            var dependencyInjectionFile =
                Path.Combine(
                    backendStudioRoot,

                    "AppCore.Infrastructure",

                    "DependencyInjection.cs"
                );


            //===================================================
            // Validate Infrastructure Files
            //===================================================

            if
            (
                !File.Exists(
                    infrastructureProject
                )
            )
            {
                return Failure(
                    $"Infrastructure project was not found: {infrastructureProject}"
                );
            }


            if
            (
                !File.Exists(
                    apiProject
                )
            )
            {
                return Failure(
                    $"API project was not found: {apiProject}"
                );
            }


            if
            (
                !File.Exists(
                    dbContextFile
                )
            )
            {
                return Failure(
                    $"AppDbContext was not found: {dbContextFile}"
                );
            }


            if
            (
                !File.Exists(
                    dependencyInjectionFile
                )
            )
            {
                return Failure(
                    $"DependencyInjection.cs was not found: {dependencyInjectionFile}"
                );
            }


            //===================================================
            // Register DbSet
            //===================================================

            var dbSetResult =
                await RegisterDbSetAsync(
                    dbContextFile,

                    moduleName,

                    menuName,

                    entityName
                );


            if
            (
                !dbSetResult.Success
            )
            {
                return dbSetResult;
            }


            //===================================================
            // Register Repository
            //===================================================

            var repositoryResult =
                await RegisterRepositoryAsync(
                    dependencyInjectionFile,

                    moduleName,

                    menuName,

                    entityName
                );


            if
            (
                !repositoryResult.Success
            )
            {
                return repositoryResult;
            }


            //===================================================
            // Create Migration
            //===================================================

            var migrationName =
                $"Add{entityName}";


            var migrationResult =
                await RunDotnetEfAsync(
                    backendStudioRoot,

                    "migrations",

                    "add",

                    migrationName,

                    "--project",

                    infrastructureProject,

                    "--startup-project",

                    apiProject
                );


            if
            (
                !migrationResult.Success
            )
            {
                return Failure(
                    $"Backend registration failed during migration creation.{Environment.NewLine}{migrationResult.Message}"
                );
            }


            //===================================================
            // Database Update
            //===================================================

            var databaseResult =
                await RunDotnetEfAsync(
                    backendStudioRoot,

                    "database",

                    "update",

                    "--project",

                    infrastructureProject,

                    "--startup-project",

                    apiProject
                );


            if
            (
                !databaseResult.Success
            )
            {
                return Failure(
                    $"Backend registration failed during database update.{Environment.NewLine}{databaseResult.Message}"
                );
            }


            //===================================================
            // Success
            //===================================================

            return new BackendRegistrationResultDto
            {
                Success =
                    true,

                Message =
                    "Backend registration, migration creation, and database update completed successfully.",

                TotalOperations =
                    4,

                SuccessfulOperations =
                    4,

                FailedOperations =
                    0
            };
        }
        catch
        (
            Exception exception
        )
        {
            return Failure(
                $"Backend registration failed: {exception.Message}"
            );
        }
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<BackendRegistrationResultDto>
        RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        try
        {
            if
            (
                synchronization == null
            )
            {
                return Failure(
                    "Submenu Synchronization data is required."
                );
            }


            var backendStudioRoot =
                FindBackendStudioRoot(
                    synchronization.BackendSubMenuEntityFile
                );


            if
            (
                backendStudioRoot is null
            )
            {
                return Failure(
                    "Backend rollback failed: Backend_Studio root could not be located."
                );
            }


            var infrastructureProject =
                Path.Combine(
                    backendStudioRoot,

                    "AppCore.Infrastructure",

                    "AppCore.Infrastructure.csproj"
                );


            var apiProject =
                Path.Combine(
                    backendStudioRoot,

                    "AppCore.API",

                    "AppCore.API.csproj"
                );


            var entityName =
                ToPascalCase(
                    synchronization.SubmenuName
                    ??
                    string.Empty
                );


            var migrationName =
                $"Add{entityName}";


            //===================================================
            // Database Rollback
            //===================================================

            var migrationListResult =
                await RunDotnetEfAsync(
                    backendStudioRoot,

                    "migrations",

                    "list",

                    "--project",

                    infrastructureProject,

                    "--startup-project",

                    apiProject
                );


            if
            (
                !migrationListResult.Success
            )
            {
                return Failure(
                    $"Backend rollback failed while reading migrations.{Environment.NewLine}{migrationListResult.Message}"
                );
            }


            //===================================================
            // Remove Last Migration
            //===================================================

            var removeResult =
                await RunDotnetEfAsync(
                    backendStudioRoot,

                    "migrations",

                    "remove",

                    "--project",

                    infrastructureProject,

                    "--startup-project",

                    apiProject
                );


            if
            (
                !removeResult.Success
            )
            {
                return Failure(
                    $"Backend rollback failed while removing migration.{Environment.NewLine}{removeResult.Message}"
                );
            }


            //===================================================
            // Success
            //===================================================

            return new BackendRegistrationResultDto
            {
                Success =
                    true,

                Message =
                    $"Backend registration rollback completed successfully for {migrationName}.",

                TotalOperations =
                    1,

                SuccessfulOperations =
                    1,

                FailedOperations =
                    0
            };
        }
        catch
        (
            Exception exception
        )
        {
            return Failure(
                $"Backend registration rollback failed: {exception.Message}"
            );
        }
    }



    //===========================================================
    // Register DbSet
    //===========================================================

    private static async Task<BackendRegistrationResultDto>
        RegisterDbSetAsync
    (
        string dbContextFile,

        string moduleName,

        string menuName,

        string entityName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dbContextFile
            );


        var dbSetType =
            $"AppCore.Domain.Entities.{moduleName}.{menuName}.{entityName}";


        var dbSetName =
            $"{entityName}s";


        if
        (
            text.Contains(
                $"DbSet<{dbSetType}>",
                StringComparison.Ordinal
            )
        )
        {
            return Success(
                "DbSet already registered."
            );
        }


        var marker =
            "    //==========================================================="
            + Environment.NewLine
            + "    // AUTO REGISTER DBSETS";


        var index =
            text.IndexOf(
                marker,
                StringComparison.Ordinal
            );


        if
        (
            index < 0
        )
        {
            return Failure(
                "AUTO REGISTER DBSETS marker was not found in AppDbContext.cs."
            );
        }


        var property =
            Environment.NewLine
            + Environment.NewLine
            + $"    public DbSet<{dbSetType}>"
            + Environment.NewLine
            + $"        {dbSetName}"
            + Environment.NewLine
            + "        {"
            + Environment.NewLine
            + "            get;"
            + Environment.NewLine
            + "            set;"
            + Environment.NewLine
            + "        } = null!;"
            + Environment.NewLine;


        text =
            text.Insert(
                index,
                property
            );


        await File.WriteAllTextAsync(
            dbContextFile,
            text
        );


        return Success(
            $"DbSet registered: {dbSetName}."
        );
    }



    //===========================================================
    // Register Repository
    //===========================================================

    private static async Task<BackendRegistrationResultDto>
        RegisterRepositoryAsync
    (
        string dependencyInjectionFile,

        string moduleName,

        string menuName,

        string entityName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dependencyInjectionFile
            );


        var interfaceType =
            $"AppCore.Application.{moduleName}.{menuName}.{entityName}.Interfaces.I{entityName}Repository";


        var repositoryType =
            $"AppCore.Infrastructure.Repositories.{moduleName}.{menuName}.{entityName}Repository";


        if
        (
            text.Contains(
                $"I{entityName}Repository",
                StringComparison.Ordinal
            )
        )
        {
            return Success(
                "Repository is already registered."
            );
        }


        var marker =
            "        // services.AddScoped<ISettingsRepository, SettingsRepository>();";


        var index =
            text.IndexOf(
                marker,
                StringComparison.Ordinal
            );


        if
        (
            index < 0
        )
        {
            return Failure(
                "AUTO REGISTER REPOSITORIES marker was not found in DependencyInjection.cs."
            );
        }


        var registration =
            Environment.NewLine
            + Environment.NewLine
            + "        services.AddScoped"
            + Environment.NewLine
            + "        <"
            + Environment.NewLine
            + $"            {interfaceType},"
            + Environment.NewLine
            + $"            {repositoryType}"
            + Environment.NewLine
            + "        >();";


        text =
            text.Insert(
                index,
                registration
            );


        await File.WriteAllTextAsync(
            dependencyInjectionFile,
            text
        );


        return Success(
            $"Repository registered: I{entityName}Repository."
        );
    }



    //===========================================================
    // Run dotnet ef
    //===========================================================

    private static async Task<BackendProcessResult>
        RunDotnetEfAsync
    (
        string workingDirectory,

        params string[] arguments
    )
    {
        var startInfo =
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


        startInfo.ArgumentList.Add(
            "ef"
        );


        foreach
        (
            var argument in arguments
        )
        {
            startInfo.ArgumentList.Add(
                argument
            );
        }


        using var process =
            new Process
            {
                StartInfo =
                    startInfo
            };


        process.Start();


        var outputTask =
            process.StandardOutput.ReadToEndAsync();


        var errorTask =
            process.StandardError.ReadToEndAsync();


        await process.WaitForExitAsync();


        var output =
            await outputTask;


        var error =
            await errorTask;


        if
        (
            process.ExitCode == 0
        )
        {
            return new BackendProcessResult
            {
                Success =
                    true,

                Message =
                    output
            };
        }


        var message =
            string.IsNullOrWhiteSpace(
                error
            )
                ? output
                : error;


        return new BackendProcessResult
        {
            Success =
                false,

            Message =
                message
        };
    }



    //===========================================================
    // Find Backend Studio Root
    //===========================================================

    private static string?
        FindBackendStudioRoot
    (
        string startingFile
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                startingFile
            )
        )
        {
            return null;
        }


        var directory =
            new DirectoryInfo(
                Path.GetDirectoryName(
                    Path.GetFullPath(
                        startingFile
                    )
                )!
            );


        while
        (
            directory is not null
        )
        {
            var apiProject =
                Path.Combine(
                    directory.FullName,

                    "AppCore.API",

                    "AppCore.API.csproj"
                );


            if
            (
                File.Exists(
                    apiProject
                )
            )
            {
                return directory.FullName;
            }


            directory =
                directory.Parent;
        }


        return null;
    }



    //===========================================================
    // To Pascal Case
    //===========================================================

    private static string
        ToPascalCase
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                value
            )
        )
        {
            return string.Empty;
        }


        var result =
            new System.Text.StringBuilder();


        var capitalize =
            true;


        foreach
        (
            var character in value.Trim()
        )
        {
            if
            (
                !char.IsLetterOrDigit(
                    character
                )
            )
            {
                capitalize =
                    true;

                continue;
            }


            if
            (
                capitalize
            )
            {
                result.Append(
                    char.ToUpperInvariant(
                        character
                    )
                );

                capitalize =
                    false;
            }
            else
            {
                result.Append(
                    character
                );
            }
        }


        return result.ToString();
    }



    //===========================================================
    // Success
    //===========================================================

    private static BackendRegistrationResultDto
        Success
    (
        string message
    )
    {
        return new BackendRegistrationResultDto
        {
            Success =
                true,

            Message =
                message,

            TotalOperations =
                1,

            SuccessfulOperations =
                1,

            FailedOperations =
                0
        };
    }



    //===========================================================
    // Failure
    //===========================================================

    private static BackendRegistrationResultDto
        Failure
    (
        string message
    )
    {
        return new BackendRegistrationResultDto
        {
            Success =
                false,

            Message =
                message,

            TotalOperations =
                1,

            SuccessfulOperations =
                0,

            FailedOperations =
                1
        };
    }



    //===========================================================
    // Backend Process Result
    //===========================================================

    private sealed class BackendProcessResult
    {
        //=======================================================
        // Success
        //=======================================================

        public bool Success { get; init; }


        //=======================================================
        // Message
        //=======================================================

        public string Message { get; init; } = string.Empty;
    }

}