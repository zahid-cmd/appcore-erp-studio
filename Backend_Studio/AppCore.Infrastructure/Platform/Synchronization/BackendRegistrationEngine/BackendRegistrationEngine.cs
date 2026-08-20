//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using AppCore.Application.Platform.CommonInterfaces;

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
    // Fields
    //===========================================================

    private readonly ITemplateLoader
        _templateLoader;


    private readonly IPlaceholderEngine
        _placeholderEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public BackendRegistrationEngine
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
    // Register
    //===========================================================
    //
    // Responsibility:
    //
    //     1. Register generated DbSet in AppDbContext.cs
    //     2. Register generated repository in
    //        DependencyInjection.cs
    //
    // This engine does NOT:
    //
    //     - Create EF migrations
    //     - Remove EF migrations
    //     - Update database
    //     - Roll back database
    //     - Create database tables
    //     - Drop database tables
    //     - Execute dotnet ef
    //
    // Database synchronization is owned by the separate
    // Backend Database Synchronization Engine.
    //
    //===========================================================

    public async Task<BackendRegistrationResultDto>
        RegisterAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        var registrationState =
            new BackendRegistrationState();


        string entityNamespace =
            string.Empty;


        string entityClassName =
            string.Empty;


        string repositoryInterfaceName =
            string.Empty;


        string dependencyInjectionFile =
            string.Empty;


        string dbContextFile =
            string.Empty;


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
                    "Code Synchronization data is required."
                );
            }


            //===================================================
            // Find Backend Studio Root
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
            // Validate Generated Backend Files
            //===================================================

            var entityFile =
                synchronization.BackendSubMenuEntityFile;


            var configurationFile =
                synchronization.BackendSubMenuConfigurationFile;


            var repositoryInterfaceFile =
                synchronization.BackendSubMenuRepositoryInterfaceFile;


            var repositoryFile =
                synchronization.BackendSubMenuRepositoryFile;


            var generatedFiles =
                new Dictionary<string, string>
                {
                    {
                        entityFile,
                        "Generated entity file"
                    },

                    {
                        configurationFile,
                        "Generated configuration file"
                    },

                    {
                        repositoryInterfaceFile,
                        "Generated repository interface file"
                    },

                    {
                        repositoryFile,
                        "Generated repository file"
                    }
                };


            foreach
            (
                var generatedFile in generatedFiles
            )
            {
                if
                (
                    string.IsNullOrWhiteSpace(
                        generatedFile.Key
                    )
                )
                {
                    return Failure(
                        $"Backend registration failed: {generatedFile.Value} path is not configured."
                    );
                }


                if
                (
                    !File.Exists(
                        generatedFile.Key
                    )
                )
                {
                    return Failure(
                        $"Backend registration failed: {generatedFile.Value} was not found: {generatedFile.Key}"
                    );
                }
            }


            //===================================================
            // Infrastructure Files
            //===================================================

            dbContextFile =
                Path.Combine(
                    backendStudioRoot,
                    "AppCore.Infrastructure",
                    "Persistence",
                    "AppDbContext.cs"
                );


            dependencyInjectionFile =
                Path.Combine(
                    backendStudioRoot,
                    "AppCore.Infrastructure",
                    "DependencyInjection.cs"
                );


            //===================================================
            // Validate Infrastructure Files
            //===================================================

            var validation =
                ValidateRequiredFile(
                    dbContextFile,
                    "AppDbContext.cs"
                );


            if
            (
                validation is not null
            )
            {
                return Failure(
                    validation
                );
            }


            validation =
                ValidateRequiredFile(
                    dependencyInjectionFile,
                    "DependencyInjection.cs"
                );


            if
            (
                validation is not null
            )
            {
                return Failure(
                    validation
                );
            }


            //===================================================
            // Read Generated Entity
            //===================================================

            var entityContent =
                await File.ReadAllTextAsync(
                    entityFile
                );


            entityNamespace =
                ExtractNamespace(
                    entityContent
                )
                ?? string.Empty;


            entityClassName =
                ExtractClassName(
                    entityContent
                )
                ?? string.Empty;


            if
            (
                string.IsNullOrWhiteSpace(
                    entityNamespace
                )
            )
            {
                return Failure(
                    "Backend registration failed: Entity namespace could not be determined from the generated entity file."
                );
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    entityClassName
                )
            )
            {
                return Failure(
                    "Backend registration failed: Entity class could not be determined from the generated entity file."
                );
            }


            //===================================================
            // Read Generated Repository Interface
            //===================================================

            var repositoryInterfaceContent =
                await File.ReadAllTextAsync(
                    repositoryInterfaceFile
                );


            var repositoryInterfaceNamespace =
                ExtractNamespace(
                    repositoryInterfaceContent
                );


            repositoryInterfaceName =
                ExtractInterfaceName(
                    repositoryInterfaceContent
                )
                ?? string.Empty;


            if
            (
                string.IsNullOrWhiteSpace(
                    repositoryInterfaceNamespace
                )
            )
            {
                return Failure(
                    "Backend registration failed: Repository interface namespace could not be determined."
                );
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    repositoryInterfaceName
                )
            )
            {
                return Failure(
                    "Backend registration failed: Repository interface name could not be determined."
                );
            }


            //===================================================
            // Read Generated Repository
            //===================================================

            var repositoryContent =
                await File.ReadAllTextAsync(
                    repositoryFile
                );


            var repositoryNamespace =
                ExtractNamespace(
                    repositoryContent
                );


            var repositoryClassName =
                ExtractClassName(
                    repositoryContent
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    repositoryNamespace
                )
            )
            {
                return Failure(
                    "Backend registration failed: Repository namespace could not be determined."
                );
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    repositoryClassName
                )
            )
            {
                return Failure(
                    "Backend registration failed: Repository class could not be determined."
                );
            }


            //===================================================
            // Register DbSet In AppDbContext
            //===================================================

            registrationState.DbSet =
                await RegisterDbSetAsync(
                    dbContextFile,
                    entityNamespace,
                    entityClassName
                );


            if
            (
                !registrationState.DbSet.Result.Success
            )
            {
                return registrationState.DbSet.Result;
            }


            //===================================================
            // Register Repository In DependencyInjection
            //===================================================

            registrationState.Repository =
                await RegisterRepositoryAsync(
                    dependencyInjectionFile,
                    repositoryInterfaceNamespace,
                    repositoryInterfaceName,
                    repositoryNamespace,
                    repositoryClassName
                );


            if
            (
                !registrationState.Repository.Result.Success
            )
            {
                await CleanupRegistrationAsync(
                    registrationState,
                    dbContextFile,
                    dependencyInjectionFile,
                    entityClassName,
                    repositoryInterfaceName
                );


                return registrationState.Repository.Result;
            }


            //===================================================
            // Success
            //===================================================

            return new BackendRegistrationResultDto
            {
                Success =
                    true,

                Message =
                    $"Backend registration completed successfully for '{entityClassName}'."
                    + Environment.NewLine
                    + $"DbSet '{entityClassName}s' was registered in AppDbContext."
                    + Environment.NewLine
                    + $"Repository '{repositoryInterfaceName}' was registered in DependencyInjection."
                    + Environment.NewLine
                    + "Database migration and database synchronization are handled by the separate Backend Database Synchronization Engine.",

                TotalOperations =
                    2,

                SuccessfulOperations =
                    2,

                FailedOperations =
                    0
            };
        }
        catch
        (
            Exception exception
        )
        {
            try
            {
                await CleanupRegistrationAsync(
                    registrationState,
                    dbContextFile,
                    dependencyInjectionFile,
                    entityClassName,
                    repositoryInterfaceName
                );
            }
            catch
            {
            }


            return Failure(
                $"Backend registration failed: {exception.Message}"
            );
        }
    }



    //===========================================================
    // Rollback / Deregistration
    //===========================================================
    //
    // This method now ONLY removes backend registrations.
    //
    // It does NOT:
    //
    //     - Roll back EF migrations
    //     - Remove EF migrations
    //     - Drop database tables
    //     - Update database
    //
    // Database table removal is the responsibility of the
    // separate Backend Database Synchronization Engine.
    //
    //===========================================================

    public async Task<BackendRegistrationResultDto>
        RollbackAsync
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
                    "Code Synchronization data is required."
                );
            }


            //===================================================
            // Find Backend Studio Root
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
                    "Backend deregistration failed: Backend_Studio root could not be located."
                );
            }


            //===================================================
            // Infrastructure Files
            //===================================================

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

            var validation =
                ValidateRequiredFile(
                    dbContextFile,
                    "AppDbContext.cs"
                );


            if
            (
                validation is not null
            )
            {
                return Failure(
                    validation
                );
            }


            validation =
                ValidateRequiredFile(
                    dependencyInjectionFile,
                    "DependencyInjection.cs"
                );


            if
            (
                validation is not null
            )
            {
                return Failure(
                    validation
                );
            }


            //===================================================
            // Read Entity
            //===================================================

            var entityFile =
                synchronization.BackendSubMenuEntityFile;


            if
            (
                string.IsNullOrWhiteSpace(
                    entityFile
                )
                ||
                !File.Exists(
                    entityFile
                )
            )
            {
                return Failure(
                    $"Backend deregistration failed: Generated entity file was not found: {entityFile}"
                );
            }


            var entityContent =
                await File.ReadAllTextAsync(
                    entityFile
                );


            var entityClassName =
                ExtractClassName(
                    entityContent
                )
                ?? string.Empty;


            if
            (
                string.IsNullOrWhiteSpace(
                    entityClassName
                )
            )
            {
                return Failure(
                    "Backend deregistration failed: Entity class could not be determined from the generated entity file."
                );
            }


            //===================================================
            // Determine Repository Interface
            //===================================================

            var repositoryInterfaceName =
                string.Empty;


            var repositoryInterfaceFile =
                synchronization
                    .BackendSubMenuRepositoryInterfaceFile;


            if
            (
                !string.IsNullOrWhiteSpace(
                    repositoryInterfaceFile
                )
                &&
                File.Exists(
                    repositoryInterfaceFile
                )
            )
            {
                var repositoryInterfaceContent =
                    await File.ReadAllTextAsync(
                        repositoryInterfaceFile
                    );


                repositoryInterfaceName =
                    ExtractInterfaceName(
                        repositoryInterfaceContent
                    )
                    ?? string.Empty;
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    repositoryInterfaceName
                )
            )
            {
                repositoryInterfaceName =
                    $"I{entityClassName}Repository";
            }


            //===================================================
            // Remove DbSet
            //===================================================

            var dbSetResult =
                await RemoveDbSetAsync(
                    dbContextFile,
                    entityClassName
                );


            if
            (
                !dbSetResult.Success
            )
            {
                return dbSetResult;
            }


            //===================================================
            // Remove Repository Registration
            //===================================================

            var repositoryResult =
                await RemoveRepositoryAsync(
                    dependencyInjectionFile,
                    repositoryInterfaceName
                );


            if
            (
                !repositoryResult.Success
            )
            {
                return repositoryResult;
            }


            //===================================================
            // Success
            //===================================================

            return new BackendRegistrationResultDto
            {
                Success =
                    true,

                Message =
                    $"Backend deregistration completed successfully for '{entityClassName}'."
                    + Environment.NewLine
                    + $"DbSet '{entityClassName}s' was removed from AppDbContext."
                    + Environment.NewLine
                    + $"Repository '{repositoryInterfaceName}' was removed from DependencyInjection."
                    + Environment.NewLine
                    + "Database table and migration changes are handled by the separate Backend Database Synchronization Engine.",

                TotalOperations =
                    2,

                SuccessfulOperations =
                    2,

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
                $"Backend deregistration failed: {exception.Message}"
            );
        }
    }



    //===========================================================
    // Register DbSet
    //===========================================================

    private async Task<(BackendRegistrationResultDto Result, bool Added)>
        RegisterDbSetAsync
    (
        string dbContextFile,

        string entityNamespace,

        string entityClassName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dbContextFile
            );


        var entityType =
            $"{entityNamespace}.{entityClassName}";


        var dbSetName =
            $"{entityClassName}s";


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        if
        (
            ContainsManagedBlock(
                text,
                beginMarker,
                endMarker
            )
        )
        {
            return
            (
                Success(
                    $"DbSet already registered: {dbSetName}."
                ),
                false
            );
        }


        //=======================================================
        // Load Template
        //=======================================================

        var template =
            await _templateLoader.LoadTemplateAsync(
                "Templates/Backend/AppDbContextRegistration/AppDbContextRegistration.tpl"
            );


        //=======================================================
        // Replace Placeholders
        //=======================================================

        var registration =
            _placeholderEngine.Replace(
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{ENTITY_CLASS_NAME}}",
                        entityClassName
                    },

                    {
                        "{{ENTITY_TYPE}}",
                        entityType
                    },

                    {
                        "{{DBSET_NAME}}",
                        dbSetName
                    }
                }
            );


        //=======================================================
        // Normalize Registration
        //=======================================================

        registration =
            NormalizeDbSetRegistration(
                registration
            );


        //=======================================================
        // Locate AUTO REGISTER DBSETS
        //=======================================================

        var autoRegisterMarker =
            "// AUTO REGISTER DBSETS";


        var markerIndex =
            text.IndexOf(
                autoRegisterMarker,
                StringComparison.Ordinal
            );


        if
        (
            markerIndex < 0
        )
        {
            return
            (
                Failure(
                    "AUTO REGISTER DBSETS marker was not found in AppDbContext.cs."
                ),
                false
            );
        }


        //=======================================================
        // Locate OnModelCreating
        //=======================================================

        var sectionEndMarker =
            "protected override void OnModelCreating";


        var sectionEndIndex =
            text.IndexOf(
                sectionEndMarker,
                markerIndex +
                autoRegisterMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            sectionEndIndex < 0
        )
        {
            return
            (
                Failure(
                    "OnModelCreating boundary was not found after AUTO REGISTER DBSETS in AppDbContext.cs."
                ),
                false
            );
        }


        //=======================================================
        // Remove Old Placeholder
        //=======================================================

        text =
            RemoveDbSetRegistrationPlaceholder(
                text,
                markerIndex,
                sectionEndIndex
            );


        //=======================================================
        // Recalculate Marker
        //=======================================================

        markerIndex =
            text.IndexOf(
                autoRegisterMarker,
                StringComparison.Ordinal
            );


        //=======================================================
        // Insert Immediately Under Marker
        //=======================================================

        var insertionIndex =
            FindLineEnd(
                text,
                markerIndex
            );


        text =
            text.Insert(
                insertionIndex,
                Environment.NewLine
                + registration
            );


        await File.WriteAllTextAsync(
            dbContextFile,
            text
        );


        return
        (
            Success(
                $"DbSet registered: {dbSetName}."
            ),
            true
        );
    }



    //===========================================================
    // Normalize DbSet Registration
    //===========================================================

    private static string
        NormalizeDbSetRegistration
    (
        string registration
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                registration
            )
        )
        {
            return string.Empty;
        }


        var normalized =
            registration
                .Replace(
                    "\r\n",
                    "\n"
                )
                .Replace(
                    "\r",
                    "\n"
                )
                .Trim();


        normalized =
            Regex.Replace(
                normalized,
                @"(=\s*null!)\s*(?=\n|$)",
                "$1;",
                RegexOptions.Multiline
            );


        normalized =
            IndentRegistrationBlock(
                normalized,
                4
            );


        return
            normalized
            + Environment.NewLine
            + Environment.NewLine;
    }



    //===========================================================
    // Remove DbSet Registration Placeholder
    //===========================================================

    private static string
        RemoveDbSetRegistrationPlaceholder
    (
        string text,

        int markerIndex,

        int sectionEndIndex
    )
    {
        const string placeholder =
            "// Registration Engine adds generated DbSets here.";


        var placeholderIndex =
            text.IndexOf(
                placeholder,
                markerIndex +
                "// AUTO REGISTER DBSETS".Length,
                StringComparison.Ordinal
            );


        if
        (
            placeholderIndex < 0
            ||
            placeholderIndex >= sectionEndIndex
        )
        {
            return text;
        }


        var lineStart =
            FindLineStart(
                text,
                placeholderIndex
            );


        var lineEnd =
            FindLineEnd(
                text,
                placeholderIndex
            );


        return
            text.Remove(
                lineStart,
                lineEnd -
                lineStart
            );
    }



    //===========================================================
    // Indent Registration Block
    //===========================================================

    private static string
        IndentRegistrationBlock
    (
        string registration,

        int spaces
    )
    {
        var indentation =
            new string(
                ' ',
                spaces
            );


        return string.Join(
            Environment.NewLine,
            registration
                .Replace(
                    "\r\n",
                    "\n"
                )
                .Replace(
                    "\r",
                    "\n"
                )
                .Split(
                    '\n'
                )
                .Select(
                    line =>
                        string.IsNullOrWhiteSpace(line)
                            ? string.Empty
                            : indentation
                              + line.Trim()
                )
        );
    }



    //===========================================================
    // Remove DbSet
    //===========================================================

    private async Task<BackendRegistrationResultDto>
        RemoveDbSetAsync
    (
        string dbContextFile,

        string entityClassName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dbContextFile
            );


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        var autoRegisterMarker =
            "// AUTO REGISTER DBSETS";


        var markerIndex =
            text.IndexOf(
                autoRegisterMarker,
                StringComparison.Ordinal
            );


        if
        (
            markerIndex < 0
        )
        {
            return Failure(
                "AUTO REGISTER DBSETS marker was not found in AppDbContext.cs."
            );
        }


        var onModelCreatingMarker =
            "protected override void OnModelCreating";


        var onModelCreatingIndex =
            text.IndexOf(
                onModelCreatingMarker,
                markerIndex +
                autoRegisterMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            onModelCreatingIndex < 0
        )
        {
            return Failure(
                "OnModelCreating boundary was not found after AUTO REGISTER DBSETS in AppDbContext.cs."
            );
        }


        var blockStart =
            text.IndexOf(
                beginMarker,
                markerIndex +
                autoRegisterMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockStart < 0
            ||
            blockStart >= onModelCreatingIndex
        )
        {
            return Success(
                $"DbSet registration was already removed: {entityClassName}s."
            );
        }


        var blockEndMarkerIndex =
            text.IndexOf(
                endMarker,
                blockStart +
                beginMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockEndMarkerIndex < 0
            ||
            blockEndMarkerIndex >= onModelCreatingIndex
        )
        {
            return Failure(
                $"Generated DbSet registration block is incomplete: {entityClassName}."
            );
        }


        var blockEnd =
            FindLineEnd(
                text,
                blockEndMarkerIndex
            );


        text =
            text.Remove(
                blockStart,
                blockEnd -
                blockStart
            );


        await File.WriteAllTextAsync(
            dbContextFile,
            text
        );


        return Success(
            $"DbSet removed: {entityClassName}s."
        );
    }



    //===========================================================
    // Register Repository
    //===========================================================

    private async Task<(BackendRegistrationResultDto Result, bool Added)>
        RegisterRepositoryAsync
    (
        string dependencyInjectionFile,

        string repositoryInterfaceNamespace,

        string repositoryInterfaceName,

        string repositoryNamespace,

        string repositoryClassName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dependencyInjectionFile
            );


        var entityClassName =
            RemoveRepositorySuffix(
                RemoveInterfacePrefix(
                    repositoryInterfaceName
                )
            );


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        if
        (
            ContainsManagedBlock(
                text,
                beginMarker,
                endMarker
            )
        )
        {
            return
            (
                Success(
                    $"Repository already registered: {repositoryInterfaceName}."
                ),
                false
            );
        }


        var interfaceType =
            $"{repositoryInterfaceNamespace}.{repositoryInterfaceName}";


        var repositoryType =
            $"{repositoryNamespace}.{repositoryClassName}";


        //=======================================================
        // Load Template
        //=======================================================

        var template =
            await _templateLoader.LoadTemplateAsync(
                "Templates/Backend/DependencyInjectionRegistration/DependencyInjectionRegistration.tpl"
            );


        //=======================================================
        // Replace Placeholders
        //=======================================================

        var registration =
            _placeholderEngine.Replace(
                template,

                new Dictionary<string, string>
                {
                    {
                        "{{ENTITY_CLASS_NAME}}",
                        entityClassName
                    },

                    {
                        "{{REPOSITORY_INTERFACE_TYPE}}",
                        interfaceType
                    },

                    {
                        "{{REPOSITORY_TYPE}}",
                        repositoryType
                    }
                }
            );


        //=======================================================
        // Normalize Registration
        //=======================================================

        registration =
            NormalizeRegistrationBlock(
                registration
            );


        //=======================================================
        // Locate AUTO REGISTER REPOSITORIES
        //=======================================================

        var autoRegisterMarker =
            "// AUTO REGISTER REPOSITORIES";


        var markerIndex =
            text.IndexOf(
                autoRegisterMarker,
                StringComparison.Ordinal
            );


        if
        (
            markerIndex < 0
        )
        {
            return
            (
                Failure(
                    "AUTO REGISTER REPOSITORIES marker was not found in DependencyInjection.cs."
                ),
                false
            );
        }


        //=======================================================
        // Locate AUTO REGISTER SERVICES
        //=======================================================

        var servicesRegistrationMarker =
            "// AUTO REGISTER SERVICES";


        var servicesRegistrationIndex =
            text.IndexOf(
                servicesRegistrationMarker,
                markerIndex +
                autoRegisterMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            servicesRegistrationIndex < 0
        )
        {
            return
            (
                Failure(
                    "AUTO REGISTER SERVICES marker was not found after AUTO REGISTER REPOSITORIES in DependencyInjection.cs."
                ),
                false
            );
        }


        //=======================================================
        // Remove Old Repository Placeholder
        //=======================================================

        text =
            RemoveRepositoryRegistrationPlaceholder(
                text,
                markerIndex,
                servicesRegistrationIndex
            );


        //=======================================================
        // Recalculate Repository Marker
        //=======================================================

        markerIndex =
            text.IndexOf(
                autoRegisterMarker,
                StringComparison.Ordinal
            );


        //=======================================================
        // Insert Immediately Under Repository Marker
        //=======================================================

        var insertionIndex =
            FindLineEnd(
                text,
                markerIndex
            );


        text =
            text.Insert(
                insertionIndex,
                Environment.NewLine
                + registration
            );


        await File.WriteAllTextAsync(
            dependencyInjectionFile,
            text
        );


        return
        (
            Success(
                $"Repository registered: {repositoryInterfaceName}."
            ),
            true
        );
    }



    //===========================================================
    // Normalize Registration Block
    //===========================================================

    private static string
        NormalizeRegistrationBlock
    (
        string registration
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                registration
            )
        )
        {
            return string.Empty;
        }


        var normalized =
            registration
                .Replace(
                    "\r\n",
                    "\n"
                )
                .Replace(
                    "\r",
                    "\n"
                )
                .Trim();


        normalized =
            IndentRegistrationBlock(
                normalized,
                8
            );


        return
            normalized
            + Environment.NewLine
            + Environment.NewLine;
    }



    //===========================================================
    // Remove Repository Registration Placeholder
    //===========================================================

    private static string
        RemoveRepositoryRegistrationPlaceholder
    (
        string text,

        int markerIndex,

        int servicesRegistrationIndex
    )
    {
        const string placeholderStart =
            "// Registration Engine adds generated repository";


        var placeholderIndex =
            text.IndexOf(
                placeholderStart,
                markerIndex +
                "// AUTO REGISTER REPOSITORIES".Length,
                StringComparison.Ordinal
            );


        if
        (
            placeholderIndex < 0
            ||
            placeholderIndex >= servicesRegistrationIndex
        )
        {
            return text;
        }


        var lineStart =
            FindLineStart(
                text,
                placeholderIndex
            );


        var continuation =
            "// registrations here.";


        var continuationIndex =
            text.IndexOf(
                continuation,
                placeholderIndex,
                StringComparison.Ordinal
            );


        var lineEnd =
            continuationIndex >= 0
                ? FindLineEnd(
                    text,
                    continuationIndex
                )
                : FindLineEnd(
                    text,
                    placeholderIndex
                );


        return
            text.Remove(
                lineStart,
                lineEnd -
                lineStart
            );
    }



    //===========================================================
    // Remove Repository
    //===========================================================

    private async Task<BackendRegistrationResultDto>
        RemoveRepositoryAsync
    (
        string dependencyInjectionFile,

        string repositoryInterfaceName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dependencyInjectionFile
            );


        var entityClassName =
            RemoveRepositorySuffix(
                RemoveInterfacePrefix(
                    repositoryInterfaceName
                )
            );


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        var autoRegisterMarker =
            "// AUTO REGISTER REPOSITORIES";


        var markerIndex =
            text.IndexOf(
                autoRegisterMarker,
                StringComparison.Ordinal
            );


        if
        (
            markerIndex < 0
        )
        {
            return Failure(
                "AUTO REGISTER REPOSITORIES marker was not found in DependencyInjection.cs."
            );
        }


        var servicesRegistrationMarker =
            "// AUTO REGISTER SERVICES";


        var servicesRegistrationIndex =
            text.IndexOf(
                servicesRegistrationMarker,
                markerIndex +
                autoRegisterMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            servicesRegistrationIndex < 0
        )
        {
            return Failure(
                "AUTO REGISTER SERVICES marker was not found after AUTO REGISTER REPOSITORIES in DependencyInjection.cs."
            );
        }


        var blockStart =
            text.IndexOf(
                beginMarker,
                markerIndex +
                autoRegisterMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockStart < 0
            ||
            blockStart >= servicesRegistrationIndex
        )
        {
            return Success(
                $"Repository registration was already removed: {repositoryInterfaceName}."
            );
        }


        var blockEndMarkerIndex =
            text.IndexOf(
                endMarker,
                blockStart +
                beginMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockEndMarkerIndex < 0
            ||
            blockEndMarkerIndex >= servicesRegistrationIndex
        )
        {
            return Failure(
                $"Generated repository registration block is incomplete: {entityClassName}."
            );
        }


        var blockEnd =
            FindLineEnd(
                text,
                blockEndMarkerIndex
            );


        text =
            text.Remove(
                blockStart,
                blockEnd -
                blockStart
            );


        await File.WriteAllTextAsync(
            dependencyInjectionFile,
            text
        );


        return Success(
            $"Repository registration removed: {repositoryInterfaceName}."
        );
    }



    //===========================================================
    // Cleanup Registration
    //===========================================================

    private async Task
        CleanupRegistrationAsync
    (
        BackendRegistrationState registrationState,

        string dbContextFile,

        string dependencyInjectionFile,

        string entityClassName,

        string repositoryInterfaceName
    )
    {
        if
        (
            registrationState.Repository.Added
        )
        {
            await RemoveRepositoryAsync(
                dependencyInjectionFile,
                repositoryInterfaceName
            );
        }


        if
        (
            registrationState.DbSet.Added
        )
        {
            await RemoveDbSetAsync(
                dbContextFile,
                entityClassName
            );
        }
    }



    //===========================================================
    // Contains Managed Block
    //===========================================================

    private static bool
        ContainsManagedBlock
    (
        string text,

        string beginMarker,

        string endMarker
    )
    {
        var beginIndex =
            text.IndexOf(
                beginMarker,
                StringComparison.Ordinal
            );


        if
        (
            beginIndex < 0
        )
        {
            return false;
        }


        var endIndex =
            text.IndexOf(
                endMarker,
                beginIndex +
                beginMarker.Length,
                StringComparison.Ordinal
            );


        return endIndex >= 0;
    }



    //===========================================================
    // Find Line Start
    //===========================================================

    private static int
        FindLineStart
    (
        string text,

        int index
    )
    {
        var lineStart =
            text.LastIndexOf(
                '\n',
                Math.Max(
                    0,
                    index - 1
                )
            );


        return
            lineStart < 0
                ? 0
                : lineStart + 1;
    }



    //===========================================================
    // Find Line End
    //===========================================================

    private static int
        FindLineEnd
    (
        string text,

        int index
    )
    {
        var lineEnd =
            text.IndexOf(
                '\n',
                index
            );


        if
        (
            lineEnd < 0
        )
        {
            return text.Length;
        }


        return lineEnd + 1;
    }



    //===========================================================
    // Remove Interface Prefix
    //===========================================================

    private static string
        RemoveInterfacePrefix
    (
        string interfaceName
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                interfaceName
            )
        )
        {
            return interfaceName;
        }


        if
        (
            interfaceName.StartsWith(
                "I",
                StringComparison.Ordinal
            )
            &&
            interfaceName.Length > 1
        )
        {
            return interfaceName[1..];
        }


        return interfaceName;
    }



    //===========================================================
    // Remove Repository Suffix
    //===========================================================

    private static string
        RemoveRepositorySuffix
    (
        string name
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                name
            )
        )
        {
            return name;
        }


        const string suffix =
            "Repository";


        if
        (
            name.EndsWith(
                suffix,
                StringComparison.Ordinal
            )
        )
        {
            return name[
                ..^suffix.Length
            ];
        }


        return name;
    }



    //===========================================================
    // Extract Namespace
    //===========================================================

    private static string?
        ExtractNamespace
    (
        string content
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                content
            )
        )
        {
            return null;
        }


        var match =
            Regex.Match(
                content,
                @"\bnamespace\s+([A-Za-z_][A-Za-z0-9_.]*)",
                RegexOptions.Multiline
            );


        if
        (
            !match.Success
        )
        {
            return null;
        }


        return match.Groups[1].Value.Trim();
    }



    //===========================================================
    // Extract Class Name
    //===========================================================

    private static string?
        ExtractClassName
    (
        string content
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                content
            )
        )
        {
            return null;
        }


        var match =
            Regex.Match(
                content,
                @"\b(?:public|internal|private|protected)?\s*(?:sealed\s+|abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)",
                RegexOptions.Multiline
            );


        if
        (
            !match.Success
        )
        {
            return null;
        }


        return match.Groups[1].Value.Trim();
    }



    //===========================================================
    // Extract Interface Name
    //===========================================================

    private static string?
        ExtractInterfaceName
    (
        string content
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                content
            )
        )
        {
            return null;
        }


        var match =
            Regex.Match(
                content,
                @"\binterface\s+([A-Za-z_][A-Za-z0-9_]*)",
                RegexOptions.Multiline
            );


        if
        (
            !match.Success
        )
        {
            return null;
        }


        return match.Groups[1].Value.Trim();
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


        var fullStartingFile =
            Path.GetFullPath(
                startingFile
            );


        var startingDirectory =
            Path.GetDirectoryName(
                fullStartingFile
            );


        if
        (
            string.IsNullOrWhiteSpace(
                startingDirectory
            )
        )
        {
            return null;
        }


        var directory =
            new DirectoryInfo(
                startingDirectory
            );


        while
        (
            directory is not null
        )
        {
            var infrastructureProject =
                FindProjectFile(
                    directory.FullName,
                    "AppCore.Infrastructure"
                );


            var apiProject =
                FindProjectFile(
                    directory.FullName,
                    "AppCore.Api"
                );


            if
            (
                infrastructureProject is not null
                &&
                apiProject is not null
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
    // Find Project File
    //===========================================================

    private static string?
        FindProjectFile
    (
        string rootDirectory,

        string projectName
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                rootDirectory
            )
            ||
            string.IsNullOrWhiteSpace(
                projectName
            )
        )
        {
            return null;
        }


        var directProject =
            Path.Combine(
                rootDirectory,
                projectName,
                $"{projectName}.csproj"
            );


        if
        (
            File.Exists(
                directProject
            )
        )
        {
            return directProject;
        }


        if
        (
            !Directory.Exists(
                rootDirectory
            )
        )
        {
            return null;
        }


        var projectFiles =
            Directory.GetFiles(
                rootDirectory,
                "*.csproj",
                SearchOption.AllDirectories
            );


        return projectFiles.FirstOrDefault(
            x =>
                string.Equals(
                    Path.GetFileNameWithoutExtension(
                        x
                    ),
                    projectName,
                    StringComparison.OrdinalIgnoreCase
                )
        );
    }



    //===========================================================
    // Validate Required File
    //===========================================================

    private static string?
        ValidateRequiredFile
    (
        string filePath,

        string description
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                filePath
            )
        )
        {
            return
                $"Backend registration failed: {description} path is empty.";
        }


        if
        (
            !File.Exists(
                filePath
            )
        )
        {
            return
                $"Backend registration failed: {description} was not found: {filePath}";
        }


        return null;
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
    // Backend Registration State
    //===========================================================

    private sealed class BackendRegistrationState
    {

        //=======================================================
        // DbSet Registration
        //=======================================================

        public (BackendRegistrationResultDto Result, bool Added)
            DbSet { get; set; }


        //=======================================================
        // Repository Registration
        //=======================================================

        public (BackendRegistrationResultDto Result, bool Added)
            Repository { get; set; }

    }

}