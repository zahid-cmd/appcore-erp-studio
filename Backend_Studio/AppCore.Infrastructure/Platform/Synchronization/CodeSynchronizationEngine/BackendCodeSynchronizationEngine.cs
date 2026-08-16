//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

using AppCore.Application.Platform.CommonInterfaces;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.CodeSynchronizationEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.CodeSynchronizationEngine;


//===============================================================
// Backend Code Synchronization Engine
//===============================================================

public class BackendCodeSynchronizationEngine
    : IBackendCodeSynchronizationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly ITemplateLoader
        _templateLoader;


    private readonly IPlaceholderEngine
        _placeholderEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public BackendCodeSynchronizationEngine
    (
        ITemplateLoader templateLoader,

        IPlaceholderEngine placeholderEngine
    )
    {
        _templateLoader =
            templateLoader;


        _placeholderEngine =
            placeholderEngine;
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<BackendCodeSynchronizationResultDto>
        SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        try
        {
            //===================================================
            // Validate Synchronization
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
            // Validate Target Files
            //===================================================

            ValidateTargetFile(
                synchronization.BackendControllerFile,
                "Backend controller"
            );


            ValidateTargetFile(
                synchronization.BackendSubMenuDtoFile,
                "Backend DTO"
            );


            ValidateTargetFile(
                synchronization.BackendCreateSubMenuDtoFile,
                "Backend Create DTO"
            );


            ValidateTargetFile(
                synchronization.BackendUpdateSubMenuDtoFile,
                "Backend Update DTO"
            );


            ValidateTargetFile(
                synchronization.BackendSubMenuDefaultsDtoFile,
                "Backend Defaults DTO"
            );


            ValidateTargetFile(
                synchronization.BackendSubMenuRepositoryInterfaceFile,
                "Backend repository interface"
            );


            ValidateTargetFile(
                synchronization.BackendSubMenuEntityFile,
                "Backend entity"
            );


            ValidateTargetFile(
                synchronization.BackendSubMenuConfigurationFile,
                "Backend configuration"
            );


            ValidateTargetFile(
                synchronization.BackendSubMenuRepositoryFile,
                "Backend repository"
            );


            //===================================================
            // Entity
            //===================================================

            await WriteTemplateAsync(
                "Backend/Entity/Entity.tpl",

                synchronization.BackendSubMenuEntityFile,

                synchronization
            );


            //===================================================
            // DTO
            //===================================================

            await WriteTemplateAsync(
                "Backend/DTO/Dto.tpl",

                synchronization.BackendSubMenuDtoFile,

                synchronization
            );


            //===================================================
            // Create DTO
            //===================================================

            await WriteTemplateAsync(
                "Backend/DTO/CreateDto.tpl",

                synchronization.BackendCreateSubMenuDtoFile,

                synchronization
            );


            //===================================================
            // Update DTO
            //===================================================

            await WriteTemplateAsync(
                "Backend/DTO/UpdateDto.tpl",

                synchronization.BackendUpdateSubMenuDtoFile,

                synchronization
            );


            //===================================================
            // Defaults DTO
            //===================================================

            await WriteTemplateAsync(
                "Backend/DTO/DefaultsDto.tpl",

                synchronization.BackendSubMenuDefaultsDtoFile,

                synchronization
            );


            //===================================================
            // Repository Interface
            //===================================================

            await WriteTemplateAsync(
                "Backend/RepositoryInterface/RepositoryInterface.tpl",

                synchronization.BackendSubMenuRepositoryInterfaceFile,

                synchronization
            );


            //===================================================
            // Configuration
            //===================================================

            await WriteTemplateAsync(
                "Backend/Configuration/Configuration.tpl",

                synchronization.BackendSubMenuConfigurationFile,

                synchronization
            );


            //===================================================
            // Repository
            //===================================================

            await WriteTemplateAsync(
                "Backend/Repository/Repository.tpl",

                synchronization.BackendSubMenuRepositoryFile,

                synchronization
            );


            //===================================================
            // Controller
            //===================================================

            await WriteTemplateAsync(
                "Backend/Controller/Controller.tpl",

                synchronization.BackendControllerFile,

                synchronization
            );


            //===================================================
            // Backend Build
            //===================================================

            var buildResult =
                await BuildBackendAsync(
                    synchronization.BackendSubMenuEntityFile
                );


            //===================================================
            // Build Failed
            //===================================================

            if
            (
                !buildResult.Success
            )
            {
                return new BackendCodeSynchronizationResultDto
                {
                    Success =
                        false,

                    Message =
                        buildResult.Message,

                    BuildStatus =
                        "Failed",

                    TotalOperations =
                        10,

                    SuccessfulOperations =
                        9,

                    FailedOperations =
                        1
                };
            }


            //===================================================
            // Build Successful
            //===================================================

            return new BackendCodeSynchronizationResultDto
            {
                Success =
                    true,

                Message =
                    buildResult.Message,

                BuildStatus =
                    "Successful",

                TotalOperations =
                    10,

                SuccessfulOperations =
                    10,

                FailedOperations =
                    0
            };
        }
        catch
        (
            Exception exception
        )
        {
            return new BackendCodeSynchronizationResultDto
            {
                Success =
                    false,

                Message =
                    exception.Message,

                BuildStatus =
                    "Failed",

                TotalOperations =
                    10,

                SuccessfulOperations =
                    0,

                FailedOperations =
                    10
            };
        }
    }



    //===========================================================
    // Rollback
    //===========================================================
    //
    // IMPORTANT:
    //
    // Rollback does not delete generated folders or files.
    //
    // The nine backend target files already exist because they
    // were created by Submenu Synchronization.
    //
    // Rollback only clears their generated code.
    //
    //===========================================================

    public async Task<BackendCodeSynchronizationResultDto>
        RollbackAsync
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
            // Entity
            //===================================================

            await ClearFileAsync(
                synchronization.BackendSubMenuEntityFile
            );


            //===================================================
            // DTO
            //===================================================

            await ClearFileAsync(
                synchronization.BackendSubMenuDtoFile
            );


            //===================================================
            // Create DTO
            //===================================================

            await ClearFileAsync(
                synchronization.BackendCreateSubMenuDtoFile
            );


            //===================================================
            // Update DTO
            //===================================================

            await ClearFileAsync(
                synchronization.BackendUpdateSubMenuDtoFile
            );


            //===================================================
            // Defaults DTO
            //===================================================

            await ClearFileAsync(
                synchronization.BackendSubMenuDefaultsDtoFile
            );


            //===================================================
            // Repository Interface
            //===================================================

            await ClearFileAsync(
                synchronization.BackendSubMenuRepositoryInterfaceFile
            );


            //===================================================
            // Configuration
            //===================================================

            await ClearFileAsync(
                synchronization.BackendSubMenuConfigurationFile
            );


            //===================================================
            // Repository
            //===================================================

            await ClearFileAsync(
                synchronization.BackendSubMenuRepositoryFile
            );


            //===================================================
            // Controller
            //===================================================

            await ClearFileAsync(
                synchronization.BackendControllerFile
            );


            //===================================================
            // Success
            //===================================================

            return new BackendCodeSynchronizationResultDto
            {
                Success =
                    true,

                Message =
                    "Backend code rollback completed successfully.",

                BuildStatus =
                    "Not Run",

                TotalOperations =
                    9,

                SuccessfulOperations =
                    9,

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
                $"Backend code rollback failed: {exception.Message}"
            );
        }
    }



    //===========================================================
    // Validate Target File
    //===========================================================

    private static void ValidateTargetFile
    (
        string targetFile,

        string description
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                targetFile
            )
        )
        {
            throw new InvalidOperationException(
                $"{description} target file is not configured."
            );
        }


        if
        (
            !File.Exists(
                targetFile
            )
        )
        {
            throw new FileNotFoundException(
                $"{description} target file was not found: {targetFile}"
            );
        }
    }



    //===========================================================
    // Write Template
    //===========================================================

    private async Task WriteTemplateAsync
    (
        string templateRelativePath,

        string targetFile,

        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Target
        //=======================================================

        ValidateTargetFile(
            targetFile,

            "Backend"
        );


        //=======================================================
        // Load Template
        //=======================================================

        var content =
            await _templateLoader.LoadTemplateAsync(
                templateRelativePath
            );


        //=======================================================
        // Build Replacements
        //=======================================================

        var replacements =
            BuildReplacements(
                synchronization
            );


        //=======================================================
        // Apply Replacements
        //=======================================================

        content =
            _placeholderEngine.Replace(
                content,

                replacements
            );


        //=======================================================
        // Write Into Existing File
        //=======================================================

        await File.WriteAllTextAsync(
            targetFile,

            content
        );
    }



    //===========================================================
    // Build Backend
    //===========================================================

    private static async Task<BackendBuildResult>
        BuildBackendAsync
    (
        string generatedBackendFile
    )
    {
        //=======================================================
        // Validate Generated File
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                generatedBackendFile
            )
        )
        {
            return new BackendBuildResult
            {
                Success =
                    false,

                Message =
                    "Backend build failed: generated backend file path is missing."
            };
        }


        //=======================================================
        // Find Backend Studio Root
        //=======================================================

        var backendStudioRoot =
            FindBackendStudioRoot(
                generatedBackendFile
            );


        if
        (
            backendStudioRoot is null
        )
        {
            return new BackendBuildResult
            {
                Success =
                    false,

                Message =
                    "Backend build failed: Backend_Studio root could not be located."
            };
        }


        //=======================================================
        // Locate API Project
        //=======================================================

        var apiProject =
            Path.Combine(
                backendStudioRoot,

                "AppCore.API",

                "AppCore.API.csproj"
            );


        if
        (
            !File.Exists(
                apiProject
            )
        )
        {
            return new BackendBuildResult
            {
                Success =
                    false,

                Message =
                    $"Backend build failed: API project was not found: {apiProject}"
            };
        }


        //=======================================================
        // Temporary Build Directory
        //=======================================================

        var buildDirectory =
            Path.Combine(
                Path.GetTempPath(),

                "AppCoreBackendBuild",

                Guid.NewGuid().ToString("N")
            );


        Directory.CreateDirectory(
            buildDirectory
        );


        try
        {
            //===================================================
            // Process Start Information
            //===================================================

            var processStartInfo =
                new ProcessStartInfo
                {
                    FileName =
                        "dotnet",

                    WorkingDirectory =
                        Path.GetDirectoryName(
                            apiProject
                        )!,

                    UseShellExecute =
                        false,

                    RedirectStandardOutput =
                        true,

                    RedirectStandardError =
                        true,

                    CreateNoWindow =
                        true
                };


            //===================================================
            // Build Arguments
            //===================================================

            processStartInfo.ArgumentList.Add(
                "build"
            );


            processStartInfo.ArgumentList.Add(
                apiProject
            );


            processStartInfo.ArgumentList.Add(
                "--no-restore"
            );


            processStartInfo.ArgumentList.Add(
                "-p:BaseOutputPath=" +
                Path.Combine(
                    buildDirectory,
                    "bin"
                ) +
                Path.DirectorySeparatorChar
            );


            //===================================================
            // Start Process
            //===================================================

            using var process =
                new Process
                {
                    StartInfo =
                        processStartInfo
                };


            process.Start();


            //===================================================
            // Read Output
            //===================================================

            var standardOutputTask =
                process.StandardOutput.ReadToEndAsync();


            var standardErrorTask =
                process.StandardError.ReadToEndAsync();


            //===================================================
            // Wait
            //===================================================

            await process.WaitForExitAsync();


            var standardOutput =
                await standardOutputTask;


            var standardError =
                await standardErrorTask;


            //===================================================
            // Build Successful
            //===================================================

            if
            (
                process.ExitCode == 0
            )
            {
                return new BackendBuildResult
                {
                    Success =
                        true,

                    Message =
                        "Backend code synchronization and internal dotnet build completed successfully."
                };
            }


            //===================================================
            // Build Failed
            //===================================================

            var buildOutput =
                string.IsNullOrWhiteSpace(
                    standardError
                )
                    ? standardOutput
                    : standardError;


            return new BackendBuildResult
            {
                Success =
                    false,

                Message =
                    $"Backend build failed.{Environment.NewLine}{buildOutput}"
            };
        }
        catch
        (
            Exception exception
        )
        {
            return new BackendBuildResult
            {
                Success =
                    false,

                Message =
                    $"Backend build could not be executed: {exception.Message}"
            };
        }
        finally
        {
            //===================================================
            // Remove Temporary Build Directory
            //===================================================

            try
            {
                if
                (
                    Directory.Exists(
                        buildDirectory
                    )
                )
                {
                    Directory.Delete(
                        buildDirectory,

                        true
                    );
                }
            }
            catch
            {
                //===============================================
                // Temporary cleanup failure must not change
                // the actual build result.
                //===============================================
            }
        }
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
    // Clear File
    //===========================================================

    private static async Task ClearFileAsync
    (
        string filePath
    )
    {
        //=======================================================
        // Validate Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                filePath
            )
        )
        {
            return;
        }


        //=======================================================
        // Normalize Path
        //=======================================================

        filePath =
            Path.GetFullPath(
                filePath
            );


        //=======================================================
        // File Does Not Exist
        //=======================================================

        if
        (
            !File.Exists(
                filePath
            )
        )
        {
            return;
        }


        //=======================================================
        // Clear Existing File
        //=======================================================

        await File.WriteAllTextAsync(
            filePath,

            string.Empty
        );
    }



    //===========================================================
    // Build Replacements
    //===========================================================

    private static Dictionary<string, string>
        BuildReplacements
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Basic Values
        //=======================================================

        var submenuName =
            synchronization.SubmenuName?.Trim()
            ??
            string.Empty;


        var submenuCode =
            synchronization.SubmenuCode?.Trim()
            ??
            string.Empty;


        var moduleName =
            synchronization.ModuleName?.Trim()
            ??
            string.Empty;


        var menuName =
            synchronization.MenuName?.Trim()
            ??
            string.Empty;


        //=======================================================
        // Entity Naming
        //=======================================================

        var entityClass =
            ToPascalCase(
                submenuName
            );


        var entityName =
            entityClass;


        //=======================================================
        // DTO Naming
        //=======================================================

        var dtoName =
            $"{entityClass}Dto";


        var createDtoName =
            $"Create{entityClass}Dto";


        var updateDtoName =
            $"Update{entityClass}Dto";


        var defaultsDtoName =
            $"{entityClass}DefaultsDto";


        //=======================================================
        // Configuration
        //=======================================================

        var configurationName =
            $"{entityClass}Configuration";


        //=======================================================
        // Repository
        //=======================================================

        var repositoryInterfaceName =
            $"I{entityClass}Repository";


        var repositoryName =
            $"{entityClass}Repository";


        //=======================================================
        // Controller
        //=======================================================

        var controllerName =
            $"{entityClass}Controller";


        //=======================================================
        // Namespace Names
        //=======================================================

        var moduleNamespace =
            ToPascalCase(
                moduleName
            );


        var menuNamespace =
            ToPascalCase(
                menuName
            );


        var entityNamespace =
            ToPascalCase(
                submenuName
            );


        var domainNamespace =
            $"AppCore.Domain.{moduleNamespace}.{menuNamespace}";


        var applicationNamespace =
            $"AppCore.Application.{moduleNamespace}.{menuNamespace}.{entityNamespace}";


        var infrastructureNamespace =
            $"AppCore.Infrastructure.{moduleNamespace}.{menuNamespace}";


        var apiNamespace =
            $"AppCore.Api.Controllers.{moduleNamespace}.{menuNamespace}";


        //=======================================================
        // Controller Route
        //=======================================================

        var controllerRoute =
            BuildApiRoute(
                moduleName,

                menuName,

                submenuName
            );


        //=======================================================
        // Replacements
        //
        // These names MUST match the backend .tpl files.
        //=======================================================

        return new Dictionary<string, string>
        {
            //===================================================
            // Entity Template
            //===================================================

            ["DomainNamespace"] =
                domainNamespace,

            ["EntityName"] =
                entityName,


            //===================================================
            // DTO Template
            //===================================================

            ["ApplicationNamespace"] =
                applicationNamespace,

            ["DtoName"] =
                dtoName,


            //===================================================
            // Create DTO Template
            //===================================================

            ["CreateDtoName"] =
                createDtoName,


            //===================================================
            // Update DTO Template
            //===================================================

            ["UpdateDtoName"] =
                updateDtoName,


            //===================================================
            // Defaults DTO Template
            //===================================================

            ["DefaultsDtoName"] =
                defaultsDtoName,


            //===================================================
            // Configuration Template
            //===================================================

            ["InfrastructureNamespace"] =
                infrastructureNamespace,

            ["ConfigurationName"] =
                configurationName,


            //===================================================
            // Repository Interface Template
            //===================================================

            ["RepositoryInterfaceName"] =
                repositoryInterfaceName,


            //===================================================
            // Repository Template
            //===================================================

            ["RepositoryName"] =
                repositoryName,


            //===================================================
            // Controller Template
            //===================================================

            ["ApiNamespace"] =
                apiNamespace,

            ["ControllerName"] =
                controllerName,

            ["ControllerRoute"] =
                controllerRoute
        };
    }



    //===========================================================
    // Build API Route
    //===========================================================

    private static string BuildApiRoute
    (
        string moduleName,

        string menuName,

        string submenuName
    )
    {
        var moduleRoute =
            ToKebabCase(
                moduleName
            );


        var menuRoute =
            ToKebabCase(
                menuName
            );


        var submenuRoute =
            ToKebabCase(
                submenuName
            );


        return
            $"{moduleRoute}/{menuRoute}/{submenuRoute}";
    }



    //===========================================================
    // To Kebab Case
    //===========================================================

    private static string ToKebabCase
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


        foreach
        (
            var character in value.Trim()
        )
        {
            if
            (
                char.IsLetterOrDigit(
                    character
                )
            )
            {
                result.Append(
                    char.ToLowerInvariant(
                        character
                    )
                );
            }
            else if
            (
                result.Length > 0
                &&
                result[^1] != '-'
            )
            {
                result.Append(
                    '-'
                );
            }
        }


        return result
            .ToString()
            .Trim('-');
    }



    //===========================================================
    // To Pascal Case
    //===========================================================

    private static string ToPascalCase
    (
        string value
    )
    {
        var kebab =
            ToKebabCase(
                value
            );


        if
        (
            string.IsNullOrWhiteSpace(
                kebab
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
            var character in kebab
        )
        {
            if
            (
                character == '-'
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
    // Failure
    //===========================================================

    private static BackendCodeSynchronizationResultDto
        Failure
    (
        string message
    )
    {
        return new BackendCodeSynchronizationResultDto
        {
            Success =
                false,

            Message =
                message,

            BuildStatus =
                "Failed",

            TotalOperations =
                10,

            SuccessfulOperations =
                0,

            FailedOperations =
                10
        };
    }



    //===========================================================
    // Backend Build Result
    //===========================================================

    private sealed class BackendBuildResult
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