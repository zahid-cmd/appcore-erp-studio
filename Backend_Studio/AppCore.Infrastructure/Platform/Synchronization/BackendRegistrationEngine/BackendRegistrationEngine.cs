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
//
// Responsibility:
//
//     RegisterAsync
//
//         1. Register generated DbSet in AppDbContext.cs
//
//         2. Register generated repository namespaces in
//            DependencyInjection.cs
//
//         3. Register generated repository service in
//            DependencyInjection.cs
//
//     RollbackAsync
//
//         1. Remove generated DbSet from AppDbContext.cs
//
//         2. Remove generated repository namespaces from
//            DependencyInjection.cs
//
//         3. Remove generated repository service from
//            DependencyInjection.cs
//
// Default Registration Mode:
//
//     If no generated registration blocks exist,
//     registration uses the default empty AUTO-BEGIN /
//     AUTO-END registration regions.
//
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


        string repositoryInterfaceNamespace =
            string.Empty;


        string repositoryInterfaceName =
            string.Empty;


        string repositoryNamespace =
            string.Empty;


        string repositoryClassName =
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
            // Validate Generated Entity File
            //===================================================

            var entityFile =
                synchronization.BackendSubMenuEntityFile;


            var validationResult =
                ValidateRequiredFile(
                    entityFile,
                    "Generated entity file"
                );


            if
            (
                validationResult != null
            )
            {
                return Failure(
                    validationResult
                );
            }


            //===================================================
            // Validate Repository Interface File
            //===================================================

            var repositoryInterfaceFile =
                synchronization
                    .BackendSubMenuRepositoryInterfaceFile;


            validationResult =
                ValidateRequiredFile(
                    repositoryInterfaceFile,
                    "Generated repository interface file"
                );


            if
            (
                validationResult != null
            )
            {
                return Failure(
                    validationResult
                );
            }


            //===================================================
            // Validate Repository File
            //===================================================

            var repositoryFile =
                synchronization
                    .BackendSubMenuRepositoryFile;


            validationResult =
                ValidateRequiredFile(
                    repositoryFile,
                    "Generated repository file"
                );


            if
            (
                validationResult != null
            )
            {
                return Failure(
                    validationResult
                );
            }


            //===================================================
            // Find Backend Studio Root
            //===================================================

            var backendStudioRoot =
                FindBackendStudioRoot(
                    entityFile
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    backendStudioRoot
                )
            )
            {
                return Failure(
                    "Backend registration failed: Backend_Studio root could not be located."
                );
            }


            //===================================================
            // Locate AppDbContext
            //===================================================

            dbContextFile =
                FindAppDbContextFile(
                    backendStudioRoot
                )
                ?? string.Empty;


            if
            (
                string.IsNullOrWhiteSpace(
                    dbContextFile
                )
            )
            {
                return Failure(
                    "Backend registration failed: AppDbContext.cs could not be located."
                );
            }


            //===================================================
            // Locate DependencyInjection
            //===================================================

            dependencyInjectionFile =
                FindDependencyInjectionFile(
                    backendStudioRoot
                )
                ?? string.Empty;


            if
            (
                string.IsNullOrWhiteSpace(
                    dependencyInjectionFile
                )
            )
            {
                return Failure(
                    "Backend registration failed: DependencyInjection.cs could not be located."
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
                );


            entityClassName =
                ExtractClassName(
                    entityContent
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    entityNamespace
                )
            )
            {
                return Failure(
                    "Backend registration failed: Entity namespace could not be determined."
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
                    "Backend registration failed: Entity class could not be determined."
                );
            }


            //===================================================
            // Read Generated Repository Interface
            //===================================================

            var repositoryInterfaceContent =
                await File.ReadAllTextAsync(
                    repositoryInterfaceFile
                );


            repositoryInterfaceNamespace =
                ExtractNamespace(
                    repositoryInterfaceContent
                );


            repositoryInterfaceName =
                ExtractInterfaceName(
                    repositoryInterfaceContent
                );


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


            repositoryNamespace =
                ExtractNamespace(
                    repositoryContent
                );


            repositoryClassName =
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
            // Register DbSet
            //===================================================

            var dbSetResult =
                await RegisterDbSetAsync
                (
                    dbContextFile,
                    entityNamespace,
                    entityClassName
                );


            if
            (
                !dbSetResult.Result.Success
            )
            {
                return dbSetResult.Result;
            }


            registrationState.DbSet =
                dbSetResult;


            //===================================================
            // Register Repository Namespaces
            //===================================================

            var namespaceResult =
                await RegisterRepositoryNamespacesAsync
                (
                    dependencyInjectionFile,
                    entityClassName,
                    repositoryInterfaceNamespace,
                    repositoryNamespace
                );


            if
            (
                !namespaceResult.Result.Success
            )
            {
                await CleanupRegistrationAsync(
                    registrationState,
                    dbContextFile,
                    dependencyInjectionFile,
                    entityClassName,
                    repositoryInterfaceName
                );

                return namespaceResult.Result;
            }


            registrationState.RepositoryNamespaces =
                namespaceResult;


            //===================================================
            // Register Repository Service
            //===================================================

            var repositoryResult =
                await RegisterRepositoryAsync
                (
                    dependencyInjectionFile,
                    entityClassName,
                    repositoryInterfaceName,
                    repositoryClassName
                );


            if
            (
                !repositoryResult.Result.Success
            )
            {
                await CleanupRegistrationAsync(
                    registrationState,
                    dbContextFile,
                    dependencyInjectionFile,
                    entityClassName,
                    repositoryInterfaceName
                );

                return repositoryResult.Result;
            }


            registrationState.Repository =
                repositoryResult;


            //===================================================
            // Success
            //===================================================

            return new BackendRegistrationResultDto
            {
                Success =
                    true,

                Message =
                    $"Backend registration completed successfully for '{entityClassName}'.",

                TotalOperations =
                    3,

                SuccessfulOperations =
                    3,

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
            // Validate Entity File
            //===================================================

            var entityFile =
                synchronization.BackendSubMenuEntityFile;


            var validationResult =
                ValidateRequiredFile(
                    entityFile,
                    "Generated entity file"
                );


            if
            (
                validationResult != null
            )
            {
                return Failure(
                    validationResult
                );
            }


            //===================================================
            // Find Backend Studio Root
            //===================================================

            var backendStudioRoot =
                FindBackendStudioRoot(
                    entityFile
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    backendStudioRoot
                )
            )
            {
                return Failure(
                    "Backend rollback failed: Backend_Studio root could not be located."
                );
            }


            //===================================================
            // Locate Files
            //===================================================

            var dbContextFile =
                FindAppDbContextFile(
                    backendStudioRoot
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    dbContextFile
                )
            )
            {
                return Failure(
                    "Backend rollback failed: AppDbContext.cs could not be located."
                );
            }


            var dependencyInjectionFile =
                FindDependencyInjectionFile(
                    backendStudioRoot
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    dependencyInjectionFile
                )
            )
            {
                return Failure(
                    "Backend rollback failed: DependencyInjection.cs could not be located."
                );
            }


            //===================================================
            // Read Entity
            //===================================================

            var entityContent =
                await File.ReadAllTextAsync(
                    entityFile
                );


            var entityClassName =
                ExtractClassName(
                    entityContent
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    entityClassName
                )
            )
            {
                return Failure(
                    "Backend rollback failed: Entity class could not be determined."
                );
            }


            //===================================================
            // Determine Repository Interface
            //===================================================

            var repositoryInterfaceName =
                $"I{entityClassName}Repository";


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


                var extractedInterfaceName =
                    ExtractInterfaceName(
                        repositoryInterfaceContent
                    );


                if
                (
                    !string.IsNullOrWhiteSpace(
                        extractedInterfaceName
                    )
                )
                {
                    repositoryInterfaceName =
                        extractedInterfaceName;
                }
            }


            //===================================================
            // Remove Repository Service
            //===================================================

            var repositoryResult =
                await RemoveRepositoryAsync
                (
                    dependencyInjectionFile,
                    entityClassName,
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
            // Remove Repository Namespaces
            //===================================================

            var namespaceResult =
                await RemoveRepositoryNamespacesAsync
                (
                    dependencyInjectionFile,
                    entityClassName
                );


            if
            (
                !namespaceResult.Success
            )
            {
                return namespaceResult;
            }


            //===================================================
            // Remove DbSet
            //===================================================

            var dbSetResult =
                await RemoveDbSetAsync
                (
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
            // Success
            //===================================================

            return new BackendRegistrationResultDto
            {
                Success =
                    true,

                Message =
                    $"Backend registration rollback completed successfully for '{entityClassName}'.",

                TotalOperations =
                    3,

                SuccessfulOperations =
                    3,

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

    private async Task
        <
            (
                BackendRegistrationResultDto Result,
                bool Added
            )
        >
        RegisterDbSetAsync
    (
        string dbContextFile,

        string entityNamespace,

        string entityClassName
    )
    {
        var text =
            await File.ReadAllTextAsync
            (
                dbContextFile
            );


        var entityType =
            $"{entityNamespace}.{entityClassName}";


        var dbSetName =
            $"{entityClassName}s";


        //=======================================================
        // Registration Block
        //=======================================================

        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        //=======================================================
        // Check Existing Registration
        //=======================================================

        if
        (
            ContainsManagedBlock
            (
                text,

                beginMarker,

                endMarker
            )
        )
        {
            return
            (
                Success
                (
                    $"DbSet already registered: {dbSetName}."
                ),

                false
            );
        }


        //=======================================================
        // Load Registration Template
        //=======================================================

        var template =
            await _templateLoader.LoadTemplateAsync
            (
                "Templates/Backend/AppDbContextRegistration/AppDbContextRegistration.tpl"
            );


        //=======================================================
        // Replace Placeholders
        //=======================================================

        var registration =
            _placeholderEngine.Replace
            (
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

        var normalizedLines =
            registration
                .Trim()
                .Replace
                (
                    "\r\n",
                    "\n"
                )
                .Replace
                (
                    "\r",
                    "\n"
                )
                .Split
                (
                    '\n'
                );


        var formattedRegistration =
            string.Join
            (
                Environment.NewLine,

                normalizedLines
                    .Select
                    (
                        line =>
                            string.IsNullOrWhiteSpace
                            (
                                line
                            )
                                ? string.Empty
                                : "    "
                                + line.TrimStart()
                    )
            );


        //=======================================================
        // Locate Primary Auto Registration Markers
        //=======================================================

        const string autoBeginMarker =
            "// AUTO-BEGIN : AUTO REGISTER DBSETS";


        const string autoEndMarker =
            "// AUTO-END : AUTO REGISTER DBSETS";


        var beginIndex =
            text.IndexOf
            (
                autoBeginMarker,

                StringComparison.Ordinal
            );


        var endIndex =
            beginIndex >= 0
                ? text.IndexOf
                (
                    autoEndMarker,

                    beginIndex
                    + autoBeginMarker.Length,

                    StringComparison.Ordinal
                )
                : -1;


        //=======================================================
        // Primary Registration Mode
        //=======================================================

        if
        (
            beginIndex >= 0
            &&
            endIndex >= 0
        )
        {
            var insertionIndex =
                FindLineStart
                (
                    text,

                    endIndex
                );


            text =
                text.Insert
                (
                    insertionIndex,

                    formattedRegistration
                    + Environment.NewLine
                    + Environment.NewLine
                );


            await File.WriteAllTextAsync
            (
                dbContextFile,

                text
            );


            return
            (
                Success
                (
                    $"DbSet registered: {dbSetName}."
                ),

                true
            );
        }


        //=======================================================
        // Default Registration Mode
        //
        // Used only when AUTO-BEGIN/AUTO-END markers
        // are not available.
        //=======================================================

        const string autoRegisterSectionMarker =
            "// AUTO REGISTER DBSETS";


        var sectionMarkerIndex =
            text.IndexOf
            (
                autoRegisterSectionMarker,

                StringComparison.Ordinal
            );


        if
        (
            sectionMarkerIndex < 0
        )
        {
            return
            (
                Failure
                (
                    "No valid DbSet registration section was found in AppDbContext.cs."
                ),

                false
            );
        }


        var onModelCreatingIndex =
            text.IndexOf
            (
                "protected override void OnModelCreating",

                sectionMarkerIndex
                + autoRegisterSectionMarker.Length,

                StringComparison.Ordinal
            );


        if
        (
            onModelCreatingIndex < 0
        )
        {
            return
            (
                Failure
                (
                    "OnModelCreating boundary was not found after AUTO REGISTER DBSETS in AppDbContext.cs."
                ),

                false
            );
        }


        var defaultInsertionIndex =
            FindLineStart
            (
                text,

                onModelCreatingIndex
            );


        text =
            text.Insert
            (
                defaultInsertionIndex,

                formattedRegistration
                + Environment.NewLine
                + Environment.NewLine
            );


        await File.WriteAllTextAsync
        (
            dbContextFile,

            text
        );


        return
        (
            Success
            (
                $"DbSet registered: {dbSetName}."
            ),

            true
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


        var blockStart =
            text.IndexOf(
                beginMarker,
                StringComparison.Ordinal
            );


        if
        (
            blockStart < 0
        )
        {
            return Success(
                $"DbSet registration was already removed: {entityClassName}s."
            );
        }


        var blockEndMarker =
            text.IndexOf(
                endMarker,
                blockStart
                + beginMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockEndMarker < 0
        )
        {
            return Failure(
                $"Generated DbSet registration block is incomplete: {entityClassName}."
            );
        }


        var removeStart =
            FindLineStart(
                text,
                blockStart
            );


        var removeEnd =
            FindLineEnd(
                text,
                blockEndMarker
            );


        text =
            text.Remove(
                removeStart,
                removeEnd
                - removeStart
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
    // Register Repository Namespaces
    //===========================================================

    private async Task
    <
        (
            BackendRegistrationResultDto Result,
            bool Added
        )
    >
        RegisterRepositoryNamespacesAsync
    (
        string dependencyInjectionFile,

        string entityClassName,

        string repositoryInterfaceNamespace,

        string repositoryNamespace
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dependencyInjectionFile
            );


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        var namespaceBeginRegion =
            "// AUTO-BEGIN : AUTO REGISTER NAMESPACES";


        var namespaceEndRegion =
            "// AUTO-END : AUTO REGISTER NAMESPACES";


        var regionStart =
            text.IndexOf(
                namespaceBeginRegion,
                StringComparison.Ordinal
            );


        if
        (
            regionStart < 0
        )
        {
            return
            (
                Failure(
                    "AUTO-BEGIN : AUTO REGISTER NAMESPACES marker was not found in DependencyInjection.cs."
                ),
                false
            );
        }


        var regionEnd =
            text.IndexOf(
                namespaceEndRegion,
                regionStart
                + namespaceBeginRegion.Length,
                StringComparison.Ordinal
            );


        if
        (
            regionEnd < 0
        )
        {
            return
            (
                Failure(
                    "AUTO-END : AUTO REGISTER NAMESPACES marker was not found in DependencyInjection.cs."
                ),
                false
            );
        }


        var blockStart =
            text.IndexOf(
                beginMarker,
                regionStart,
                StringComparison.Ordinal
            );


        if
        (
            blockStart >= 0
            &&
            blockStart < regionEnd
        )
        {
            return
            (
                Success(
                    $"Repository namespaces already registered: {entityClassName}."
                ),
                false
            );
        }


        var registration =
            string.Join
            (
                Environment.NewLine,

                $"// AUTO-BEGIN : {entityClassName}",

                string.Empty,

                $"using {repositoryInterfaceNamespace};",

                $"using {repositoryNamespace};",

                string.Empty,

                $"// AUTO-END : {entityClassName}",

                string.Empty
            );


        var insertionIndex =
            FindLineEnd(
                text,
                regionStart
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
                $"Repository namespaces registered: {entityClassName}."
            ),
            true
        );
    }



    //===========================================================
    // Remove Repository Namespaces
    //===========================================================

    private async Task<BackendRegistrationResultDto>
        RemoveRepositoryNamespacesAsync
    (
        string dependencyInjectionFile,

        string entityClassName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dependencyInjectionFile
            );


        var namespaceBeginRegion =
            "// AUTO-BEGIN : AUTO REGISTER NAMESPACES";


        var namespaceEndRegion =
            "// AUTO-END : AUTO REGISTER NAMESPACES";


        var regionStart =
            text.IndexOf(
                namespaceBeginRegion,
                StringComparison.Ordinal
            );


        if
        (
            regionStart < 0
        )
        {
            return Failure(
                "AUTO-BEGIN : AUTO REGISTER NAMESPACES marker was not found in DependencyInjection.cs."
            );
        }


        var regionEnd =
            text.IndexOf(
                namespaceEndRegion,
                regionStart
                + namespaceBeginRegion.Length,
                StringComparison.Ordinal
            );


        if
        (
            regionEnd < 0
        )
        {
            return Failure(
                "AUTO-END : AUTO REGISTER NAMESPACES marker was not found in DependencyInjection.cs."
            );
        }


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        var blockStart =
            text.IndexOf(
                beginMarker,
                regionStart
                + namespaceBeginRegion.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockStart < 0
            ||
            blockStart >= regionEnd
        )
        {
            return Success(
                $"Repository namespaces were already removed: {entityClassName}."
            );
        }


        var blockEndMarker =
            text.IndexOf(
                endMarker,
                blockStart
                + beginMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockEndMarker < 0
            ||
            blockEndMarker >= regionEnd
        )
        {
            return Failure(
                $"Repository namespace registration block is incomplete: {entityClassName}."
            );
        }


        var removeStart =
            FindLineStart(
                text,
                blockStart
            );


        var removeEnd =
            FindLineEnd(
                text,
                blockEndMarker
            );


        text =
            text.Remove(
                removeStart,
                removeEnd
                - removeStart
            );


        await File.WriteAllTextAsync(
            dependencyInjectionFile,
            text
        );


        return Success(
            $"Repository namespaces removed: {entityClassName}."
        );
    }



    //===========================================================
    // Register Repository
    //===========================================================

    private async Task
    <
        (
            BackendRegistrationResultDto Result,
            bool Added
        )
    >
        RegisterRepositoryAsync
    (
        string dependencyInjectionFile,

        string entityClassName,

        string repositoryInterfaceName,

        string repositoryClassName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dependencyInjectionFile
            );


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        var serviceBeginRegion =
            "// AUTO-BEGIN : AUTO REGISTER SERVICES";


        var serviceEndRegion =
            "// AUTO-END : AUTO REGISTER SERVICES";


        var regionStart =
            text.IndexOf(
                serviceBeginRegion,
                StringComparison.Ordinal
            );


        if
        (
            regionStart < 0
        )
        {
            return
            (
                Failure(
                    "AUTO-BEGIN : AUTO REGISTER SERVICES marker was not found in DependencyInjection.cs."
                ),
                false
            );
        }


        var regionEnd =
            text.IndexOf(
                serviceEndRegion,
                regionStart
                + serviceBeginRegion.Length,
                StringComparison.Ordinal
            );


        if
        (
            regionEnd < 0
        )
        {
            return
            (
                Failure(
                    "AUTO-END : AUTO REGISTER SERVICES marker was not found in DependencyInjection.cs."
                ),
                false
            );
        }


        var blockStart =
            text.IndexOf(
                beginMarker,
                regionStart
                + serviceBeginRegion.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockStart >= 0
            &&
            blockStart < regionEnd
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


        var registration =
            string.Join
            (
                Environment.NewLine,

                $"        // AUTO-BEGIN : {entityClassName}",

                string.Empty,

                "        services.AddScoped",

                "        <",

                $"            {repositoryInterfaceName},",

                $"            {repositoryClassName}",

                "        >();",

                string.Empty,

                $"        // AUTO-END : {entityClassName}",

                string.Empty
            );


        var insertionIndex =
            FindLineEnd(
                text,
                regionStart
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
    // Remove Repository
    //===========================================================

    private async Task<BackendRegistrationResultDto>
        RemoveRepositoryAsync
    (
        string dependencyInjectionFile,

        string entityClassName,

        string repositoryInterfaceName
    )
    {
        var text =
            await File.ReadAllTextAsync(
                dependencyInjectionFile
            );


        var serviceBeginRegion =
            "// AUTO-BEGIN : AUTO REGISTER SERVICES";


        var serviceEndRegion =
            "// AUTO-END : AUTO REGISTER SERVICES";


        var regionStart =
            text.IndexOf(
                serviceBeginRegion,
                StringComparison.Ordinal
            );


        if
        (
            regionStart < 0
        )
        {
            return Failure(
                "AUTO-BEGIN : AUTO REGISTER SERVICES marker was not found in DependencyInjection.cs."
            );
        }


        var regionEnd =
            text.IndexOf(
                serviceEndRegion,
                regionStart
                + serviceBeginRegion.Length,
                StringComparison.Ordinal
            );


        if
        (
            regionEnd < 0
        )
        {
            return Failure(
                "AUTO-END : AUTO REGISTER SERVICES marker was not found in DependencyInjection.cs."
            );
        }


        var beginMarker =
            $"// AUTO-BEGIN : {entityClassName}";


        var endMarker =
            $"// AUTO-END : {entityClassName}";


        var blockStart =
            text.IndexOf(
                beginMarker,
                regionStart
                + serviceBeginRegion.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockStart < 0
            ||
            blockStart >= regionEnd
        )
        {
            return Success(
                $"Repository registration was already removed: {repositoryInterfaceName}."
            );
        }


        var blockEndMarker =
            text.IndexOf(
                endMarker,
                blockStart
                + beginMarker.Length,
                StringComparison.Ordinal
            );


        if
        (
            blockEndMarker < 0
            ||
            blockEndMarker >= regionEnd
        )
        {
            return Failure(
                $"Repository registration block is incomplete: {entityClassName}."
            );
        }


        var removeStart =
            FindLineStart(
                text,
                blockStart
            );


        var removeEnd =
            FindLineEnd(
                text,
                blockEndMarker
            );


        text =
            text.Remove(
                removeStart,
                removeEnd
                - removeStart
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
            !string.IsNullOrWhiteSpace(
                dependencyInjectionFile
            )
        )
        {
            if
            (
                registrationState.Repository.Added
            )
            {
                await RemoveRepositoryAsync(
                    dependencyInjectionFile,
                    entityClassName,
                    repositoryInterfaceName
                );
            }


            if
            (
                registrationState.RepositoryNamespaces.Added
            )
            {
                await RemoveRepositoryNamespacesAsync(
                    dependencyInjectionFile,
                    entityClassName
                );
            }
        }


        if
        (
            registrationState.DbSet.Added
            &&
            !string.IsNullOrWhiteSpace(
                dbContextFile
            )
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
                beginIndex
                + beginMarker.Length,
                StringComparison.Ordinal
            );


        return
            endIndex >= 0;
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
            ||
            !File.Exists(
                startingFile
            )
        )
        {
            return null;
        }


        var currentDirectory =
            new DirectoryInfo(
                Path.GetDirectoryName(
                    Path.GetFullPath(
                        startingFile
                    )
                )!
            );


        while
        (
            currentDirectory != null
        )
        {
            var infrastructureProject =
                Directory.GetFiles(
                    currentDirectory.FullName,
                    "AppCore.Infrastructure.csproj",
                    SearchOption.AllDirectories
                )
                .FirstOrDefault();


            if
            (
                !string.IsNullOrWhiteSpace(
                    infrastructureProject
                )
            )
            {
                return
                    currentDirectory.FullName;
            }


            currentDirectory =
                currentDirectory.Parent;
        }


        return null;
    }



    //===========================================================
    // Find AppDbContext
    //===========================================================

    private static string?
        FindAppDbContextFile
    (
        string backendStudioRoot
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                backendStudioRoot
            )
            ||
            !Directory.Exists(
                backendStudioRoot
            )
        )
        {
            return null;
        }


        return
            Directory
                .GetFiles(
                    backendStudioRoot,
                    "AppDbContext.cs",
                    SearchOption.AllDirectories
                )
                .FirstOrDefault();
    }



    //===========================================================
    // Find DependencyInjection
    //===========================================================

    private static string?
        FindDependencyInjectionFile
    (
        string backendStudioRoot
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                backendStudioRoot
            )
            ||
            !Directory.Exists(
                backendStudioRoot
            )
        )
        {
            return null;
        }


        var files =
            Directory
                .GetFiles(
                    backendStudioRoot,
                    "DependencyInjection.cs",
                    SearchOption.AllDirectories
                );


        foreach
        (
            var file
            in files
        )
        {
            var content =
                File.ReadAllText(
                    file
                );


            if
            (
                content.Contains(
                    "public static class DependencyInjection",
                    StringComparison.Ordinal
                )
                &&
                content.Contains(
                    "// AUTO REGISTER",
                    StringComparison.Ordinal
                )
            )
            {
                return file;
            }
        }


        return
            files.FirstOrDefault();
    }



    //===========================================================
    // Extract Namespace
    //===========================================================

    private static string
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
            return string.Empty;
        }


        var match =
            Regex.Match(
                content,
                @"namespace\s+([A-Za-z_][A-Za-z0-9_\.]*)\s*;"
            );


        if
        (
            match.Success
        )
        {
            return
                match.Groups[1].Value.Trim();
        }


        match =
            Regex.Match(
                content,
                @"namespace\s+([A-Za-z_][A-Za-z0-9_\.]*)\s*\{"
            );


        return
            match.Success
                ? match.Groups[1].Value.Trim()
                : string.Empty;
    }



    //===========================================================
    // Extract Class Name
    //===========================================================

    private static string
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
            return string.Empty;
        }


        var match =
            Regex.Match(
                content,
                @"public\s+(?:sealed\s+|abstract\s+|partial\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)"
            );


        return
            match.Success
                ? match.Groups[1].Value.Trim()
                : string.Empty;
    }



    //===========================================================
    // Extract Interface Name
    //===========================================================

    private static string
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
            return string.Empty;
        }


        var match =
            Regex.Match(
                content,
                @"public\s+interface\s+([A-Za-z_][A-Za-z0-9_]*)"
            );


        return
            match.Success
                ? match.Groups[1].Value.Trim()
                : string.Empty;
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
        if
        (
            index <= 0
        )
        {
            return 0;
        }


        var lineStart =
            text.LastIndexOf(
                '\n',
                index
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


        return
            lineEnd < 0
                ? text.Length
                : lineEnd + 1;
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

        public
        (
            BackendRegistrationResultDto Result,
            bool Added
        )
            DbSet
            { get; set; }


        public
        (
            BackendRegistrationResultDto Result,
            bool Added
        )
            RepositoryNamespaces
            { get; set; }


        public
        (
            BackendRegistrationResultDto Result,
            bool Added
        )
            Repository
            { get; set; }

    }

}