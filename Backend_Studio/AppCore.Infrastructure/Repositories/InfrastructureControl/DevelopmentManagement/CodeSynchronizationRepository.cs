//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

using AppCore.Domain.Common;
using AppCore.Domain.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Entity Alias
//===============================================================

using CodeSynchronizationEntity =
    AppCore.Domain.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Code Synchronization Repository
//===============================================================

public class CodeSynchronizationRepository
    : ICodeSynchronizationRepository
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _context;


    private readonly ICodeSynchronizationEngine
        _codeSynchronizationEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationRepository
    (
        AppDbContext context,

        ICodeSynchronizationEngine
            codeSynchronizationEngine
    )
    {
        _context =
            context;


        _codeSynchronizationEngine =
            codeSynchronizationEngine;
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<CodeSynchronizationDto>>
        GetAllAsync
    (
        string synchronizationType
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronizationType
            )
        )
        {
            return [];
        }


        synchronizationType =
            synchronizationType.Trim();


        var synchronizations =
            await _context.CodeSynchronizations

                .Where
                (
                    x =>

                        !x.IsDeleted

                        &&

                        _context.SubmenuSynchronizations.Any
                        (
                            submenu =>

                                submenu.Id ==
                                x.SubmenuSynchronizationId

                                &&

                                !submenu.IsDeleted

                                &&

                                submenu.SynchronizationType ==
                                synchronizationType
                        )
                )

                .OrderBy
                (
                    x =>
                        x.SubmenuName
                )

                .Select
                (
                    x =>
                        new CodeSynchronizationDto
                        {
                            Id =
                                x.Id,

                            SubmenuSynchronizationId =
                                x.SubmenuSynchronizationId,


                            //===================================================
                            // Module
                            //===================================================

                            ModuleId =
                                x.ModuleId,

                            ModuleCode =
                                x.ModuleCode,

                            ModuleName =
                                x.ModuleName,


                            //===================================================
                            // Menu
                            //===================================================

                            MenuId =
                                x.MenuId,

                            MenuCode =
                                x.MenuCode,

                            MenuName =
                                x.MenuName,


                            //===================================================
                            // Submenu
                            //===================================================

                            SubmenuId =
                                x.SubmenuId,

                            SubmenuCode =
                                x.SubmenuCode,

                            SubmenuName =
                                x.SubmenuName,


                            //===================================================
                            // Synchronization Type
                            //===================================================

                            SynchronizationType =
                                _context.SubmenuSynchronizations

                                    .Where
                                    (
                                        submenu =>

                                            submenu.Id ==
                                            x.SubmenuSynchronizationId

                                            &&

                                            !submenu.IsDeleted
                                    )

                                    .Select
                                    (
                                        submenu =>
                                            submenu.SynchronizationType
                                    )

                                    .FirstOrDefault()
                                    ?? string.Empty,


                            //===================================================
                            // Synchronization Status
                            //===================================================

                            Status =
                                x.Status,

                            BuildStatus =
                                x.BuildStatus,

                            DbStatus =
                                x.DbStatus,

                            MigrationStatus =
                                x.MigrationStatus,

                            DatabaseCreated =
                                x.DatabaseCreated,

                            Remarks =
                                x.Remarks,


                            //===================================================
                            // Last Synchronization
                            //===================================================

                            LastSynchronizedBy =
                                x.LastSynchronizedBy,

                            LastSynchronizedDate =
                                x.LastSynchronizedDate,

                            LastSynchronizationResult =
                                x.LastSynchronizationResult,


                            //===================================================
                            // General
                            //===================================================

                            IsActive =
                                x.IsActive,

                            CreatedDate =
                                x.CreatedDate
                        }
                )

                .ToListAsync();


        //=======================================================
        // Reconcile Backend Database State
        //
        // The physical database is the authoritative source.
        //
        // The actual EF Core entity is resolved from the
        // BackendSubMenuEntityFile stored in the
        // SubmenuSynchronization record.
        //
        // The EF Core model then provides the actual mapped
        // database table name and schema.
        //
        // No AutoSync migration or EF migration history is used.
        //=======================================================

        if
        (
            string.Equals
            (
                synchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
            &&
            synchronizations.Count > 0
        )
        {
            await ReconcileDatabaseCreatedAsync
            (
                synchronizations
            );
        }


        return synchronizations;
    }

    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CodeSynchronizationDto?>
        GetByIdAsync
    (
        long id
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .Where
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        new CodeSynchronizationDto
                        {
                            Id =
                                x.Id,

                            SubmenuSynchronizationId =
                                x.SubmenuSynchronizationId,

                            ModuleId =
                                x.ModuleId,

                            ModuleCode =
                                x.ModuleCode,

                            ModuleName =
                                x.ModuleName,

                            MenuId =
                                x.MenuId,

                            MenuCode =
                                x.MenuCode,

                            MenuName =
                                x.MenuName,

                            SubmenuId =
                                x.SubmenuId,

                            SubmenuCode =
                                x.SubmenuCode,

                            SubmenuName =
                                x.SubmenuName,

                            SynchronizationType =
                                _context.SubmenuSynchronizations

                                    .Where
                                    (
                                        submenu =>

                                            submenu.Id ==
                                            x.SubmenuSynchronizationId

                                            &&

                                            !submenu.IsDeleted
                                    )

                                    .Select
                                    (
                                        submenu =>
                                            submenu.SynchronizationType
                                    )

                                    .FirstOrDefault()
                                    ?? string.Empty,

                            Status =
                                x.Status,

                            BuildStatus =
                                x.BuildStatus,

                            DbStatus =
                                x.DbStatus,

                            MigrationStatus =
                                x.MigrationStatus,

                            DatabaseCreated =
                                x.DatabaseCreated,

                            Remarks =
                                x.Remarks,

                            LastSynchronizedBy =
                                x.LastSynchronizedBy,

                            LastSynchronizedDate =
                                x.LastSynchronizedDate,

                            LastSynchronizationResult =
                                x.LastSynchronizationResult,

                            IsActive =
                                x.IsActive,

                            CreatedDate =
                                x.CreatedDate
                        }
                )

                .FirstOrDefaultAsync();


        if
        (
            synchronization == null
        )
        {
            return null;
        }


        //=======================================================
        // Reconcile Backend Database State
        //
        // The physical database is the authoritative source.
        //=======================================================

        if
        (
            string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            await ReconcileDatabaseCreatedAsync
            (
                new List<CodeSynchronizationDto>
                {
                    synchronization
                }
            );
        }


        return synchronization;
    }

    //===========================================================
    // Reconcile Database Created State
    //===========================================================
    //
    // DatabaseCreated is determined from the actual physical
    // database table represented by the generated backend entity.
    //
    // Flow:
    //
    // Code Synchronization
    //        ↓
    // Submenu Synchronization
    //        ↓
    // BackendSubMenuEntityFile
    //        ↓
    // Entity Class
    //        ↓
    // EF Core Model Metadata
    //        ↓
    // Actual Table Name + Schema
    //        ↓
    // PostgreSQL Physical Table
    //
    // No AutoSync migration is inspected here.
    //
    //===========================================================

    private async Task
        ReconcileDatabaseCreatedAsync
    (
        List<CodeSynchronizationDto>
            synchronizations
    )
    {
        if
        (
            synchronizations.Count == 0
        )
        {
            return;
        }


        var submenuSynchronizationIds =
            synchronizations

                .Select
                (
                    x =>
                        x.SubmenuSynchronizationId
                )

                .Distinct()

                .ToList();


        var submenuSynchronizations =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .Where
                (
                    x =>

                        submenuSynchronizationIds.Contains
                        (
                            x.Id
                        )

                        &&

                        !x.IsDeleted
                )

                .ToDictionaryAsync
                (
                    x =>
                        x.Id
                );


        foreach
        (
            var synchronization in synchronizations
        )
        {
            if
            (
                !string.Equals
                (
                    synchronization.SynchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }


            if
            (
                !submenuSynchronizations.TryGetValue
                (
                    synchronization.SubmenuSynchronizationId,

                    out var submenuSynchronization
                )
            )
            {
                continue;
            }


            synchronization.DatabaseCreated =
                await IsBackendEntityTableCreatedAsync
                (
                    submenuSynchronization
                        .BackendSubMenuEntityFile
                );
        }
    }



    //===========================================================
    // Check Backend Entity Table
    //===========================================================
    //
    // The table name is NOT generated from SubmenuName.
    //
    // It is obtained from the actual EF Core entity metadata.
    //
    //===========================================================

    private async Task<bool>
        IsBackendEntityTableCreatedAsync
    (
        string? entityFile
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                entityFile
            )
        )
        {
            return false;
        }


        var entityClassName =
            Path.GetFileNameWithoutExtension
            (
                entityFile.Trim()
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                entityClassName
            )
        )
        {
            return false;
        }


        //=======================================================
        // Resolve The Actual Entity From The EF Core Model
        //=======================================================

        var entityType =
            _context.Model

                .GetEntityTypes()

                .FirstOrDefault
                (
                    x =>

                        string.Equals
                        (
                            x.ClrType.Name,

                            entityClassName,

                            StringComparison.Ordinal
                        )
                );


        if
        (
            entityType == null
        )
        {
            return false;
        }


        //=======================================================
        // Resolve The Actual Database Mapping
        //=======================================================

        var tableName =
            entityType.GetTableName();


        if
        (
            string.IsNullOrWhiteSpace
            (
                tableName
            )
        )
        {
            return false;
        }


        var schema =
            entityType.GetSchema();


        if
        (
            string.IsNullOrWhiteSpace
            (
                schema
            )
        )
        {
            schema =
                _context.Model.GetDefaultSchema();
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                schema
            )
        )
        {
            schema =
                "public";
        }


        //=======================================================
        // Inspect The Physical PostgreSQL Database
        //=======================================================

        try
        {
            var connection =
                _context.Database.GetDbConnection();


            var shouldCloseConnection =
                connection.State !=
                System.Data.ConnectionState.Open;


            if
            (
                shouldCloseConnection
            )
            {
                await connection.OpenAsync();
            }


            await using var command =
                connection.CreateCommand();


            command.CommandText =
                """
                SELECT EXISTS
                (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = @schema
                    AND table_name = @tableName
                );
                """;


            var schemaParameter =
                command.CreateParameter();


            schemaParameter.ParameterName =
                "@schema";


            schemaParameter.Value =
                schema;


            command.Parameters.Add
            (
                schemaParameter
            );


            var tableNameParameter =
                command.CreateParameter();


            tableNameParameter.ParameterName =
                "@tableName";


            tableNameParameter.Value =
                tableName;


            command.Parameters.Add
            (
                tableNameParameter
            );


            var result =
                await command.ExecuteScalarAsync();


            if
            (
                shouldCloseConnection
            )
            {
                await connection.CloseAsync();
            }


            return
                result is bool exists
                    && exists;
        }

        catch
        {
            //===================================================
            // Database inspection is supplemental.
            //
            // If the database cannot be inspected, do not allow
            // the synchronization list/detail operation to fail.
            //===================================================

            return false;
        }
    }

    //===========================================================
    // Get Generated Files
    //===========================================================

    public async Task<List<CodeSynchronizationFileDto>>
        GetFilesAsync
    (
        long id
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return [];
        }


        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        codeSynchronization.SubmenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            return [];
        }


        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return await BuildFrontendFilesAsync
            (
                submenuSynchronization,

                codeSynchronization.SynchronizationType,

                codeSynchronization.ModuleName,

                codeSynchronization.LastSynchronizedDate
            );
        }


        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return await BuildBackendFilesAsync
            (
                submenuSynchronization,

                codeSynchronization.SynchronizationType,

                codeSynchronization.ModuleName,

                codeSynchronization.LastSynchronizedDate
            );
        }


        return [];
    }



    //===========================================================
    // Get Submenu Synchronization For Registration
    //===========================================================

    public async Task<SubmenuSynchronizationDto?>
        GetSubmenuSynchronizationForRegistrationAsync
    (
        long id
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return null;
        }


        var synchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        codeSynchronization.SubmenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return null;
        }


        return new SubmenuSynchronizationDto
        {
            Id =
                synchronization.Id,

            ModuleId =
                synchronization.ModuleId,

            ModuleCode =
                synchronization.ModuleCode,

            ModuleName =
                synchronization.ModuleName,


            MenuId =
                synchronization.MenuId,

            MenuCode =
                synchronization.MenuCode,

            MenuName =
                synchronization.MenuName,


            SubmenuId =
                synchronization.SubmenuId,

            SubmenuCode =
                synchronization.SubmenuCode,

            SubmenuName =
                synchronization.SubmenuName,


            SynchronizationType =
                synchronization.SynchronizationType,


            //===================================================
            // Backend Target Location
            //===================================================

            BackendSolution =
                synchronization.BackendSolution,

            BackendApplicationProject =
                synchronization.BackendApplicationProject,

            BackendDomainProject =
                synchronization.BackendDomainProject,

            BackendInfrastructureProject =
                synchronization.BackendInfrastructureProject,


            //===================================================
            // Backend API
            //===================================================

            BackendControllerFile =
                synchronization.BackendControllerFile,


            //===================================================
            // Backend Application
            //===================================================

            BackendSubMenuDtoFile =
                synchronization.BackendSubMenuDtoFile,

            BackendCreateSubMenuDtoFile =
                synchronization.BackendCreateSubMenuDtoFile,

            BackendUpdateSubMenuDtoFile =
                synchronization.BackendUpdateSubMenuDtoFile,

            BackendSubMenuDefaultsDtoFile =
                synchronization.BackendSubMenuDefaultsDtoFile,

            BackendSubMenuRepositoryInterfaceFile =
                synchronization.BackendSubMenuRepositoryInterfaceFile,


            //===================================================
            // Backend Domain
            //===================================================

            BackendSubMenuEntityFile =
                synchronization.BackendSubMenuEntityFile,


            //===================================================
            // Backend Infrastructure
            //===================================================

            BackendSubMenuConfigurationFile =
                synchronization.BackendSubMenuConfigurationFile,

            BackendSubMenuRepositoryFile =
                synchronization.BackendSubMenuRepositoryFile
        };
    }



    //===========================================================
    // Initialize File
    //===========================================================

    public async Task<bool>
        InitializeFileAsync
    (
        long id,

        string fileName
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return false;
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                fileName
            )
        )
        {
            return false;
        }


        var requestedFileName =
            Path.GetFileName
            (
                fileName.Trim()
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                requestedFileName
            )
        )
        {
            return false;
        }


        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        codeSynchronization.SubmenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            return false;
        }


        //=======================================================
        // Resolve The Exact Source File From The Synchronization
        // Definition.
        //
        // Each generated file remains independently identified
        // by its own FileName.
        //=======================================================

        var files =
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
                ? new List<string>
                {
                    submenuSynchronization.FrontendSubmenuModelFile,

                    submenuSynchronization.FrontendSubmenuServiceFile,

                    submenuSynchronization.FrontendSubmenuRouteFile,

                    submenuSynchronization.FrontendSubmenuFormTsFile,

                    submenuSynchronization.FrontendSubmenuFormHtmlFile,

                    submenuSynchronization.FrontendSubmenuFormCssFile,

                    submenuSynchronization.FrontendSubmenuListTsFile,

                    submenuSynchronization.FrontendSubmenuListHtmlFile,

                    submenuSynchronization.FrontendSubmenuListCssFile
                }

                : string.Equals
                (
                    codeSynchronization.SynchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
                    ? new List<string>
                    {
                        submenuSynchronization.BackendControllerFile,

                        submenuSynchronization.BackendSubMenuDtoFile,

                        submenuSynchronization.BackendCreateSubMenuDtoFile,

                        submenuSynchronization.BackendUpdateSubMenuDtoFile,

                        submenuSynchronization.BackendSubMenuDefaultsDtoFile,

                        submenuSynchronization.BackendSubMenuRepositoryInterfaceFile,

                        submenuSynchronization.BackendSubMenuEntityFile,

                        submenuSynchronization.BackendSubMenuConfigurationFile,

                        submenuSynchronization.BackendSubMenuRepositoryFile
                    }

                    : [];


        var filePath =
            files

                .Where
                (
                    x =>
                        !string.IsNullOrWhiteSpace
                        (
                            x
                        )
                )

                .Select
                (
                    x =>
                        Path.GetFullPath
                        (
                            x.Trim()
                        )
                )

                .FirstOrDefault
                (
                    x =>
                        string.Equals
                        (
                            Path.GetFileName
                            (
                                x
                            ),

                            requestedFileName,

                            StringComparison.OrdinalIgnoreCase
                        )
                );


        if
        (
            string.IsNullOrWhiteSpace
            (
                filePath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Initialize Works Only On The Existing Source File.
        //
        // It NEVER creates a source file.
        //=======================================================

        if
        (
            !File.Exists
            (
                filePath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Resolve Protected Baseline
        //
        // The Code Synchronization Engine owns the centralized
        // baseline location.
        //
        // Initialize MUST use that protected baseline only.
        // It NEVER uses a source-side backup file.
        // It NEVER creates a baseline.
        //=======================================================

        var baselinePath =
            GetExistingBaselinePath
            (
                filePath,

                codeSynchronization.SynchronizationType,

                codeSynchronization.ModuleName
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                baselinePath
            )
        )
        {
            return false;
        }


        if
        (
            !File.Exists
            (
                baselinePath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Initialize:
        //
        // Existing Baseline
        //        ↓
        // Existing Source File
        //
        // Only the contents of the existing source file are
        // replaced.
        //
        // NO source copy is created.
        // NO baseline is created.
        // NO restore file is created.
        //=======================================================

        var baselineBytes =
            await File.ReadAllBytesAsync
            (
                baselinePath
            );


        await File.WriteAllBytesAsync
        (
            filePath,

            baselineBytes
        );


        //=======================================================
        // Preserve Baseline Timestamp
        //=======================================================

        File.SetLastWriteTimeUtc
        (
            filePath,

            File.GetLastWriteTimeUtc
            (
                baselinePath
            )
        );


        //=======================================================
        // Verify Initialization
        //=======================================================

        var stillModified =
            await IsFileModifiedAsync
            (
                filePath,

                baselinePath
            );


        return
            !stillModified;
    }



    //===========================================================
    // Initialize All Files
    //===========================================================

    public async Task<bool>
        InitializeAllFilesAsync
    (
        long id
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return false;
        }


        var files =
            await GetSynchronizationFilePathsAsync
            (
                id
            );


        if
        (
            files.Count == 0
        )
        {
            return false;
        }


        var modifiedFiles =
            0;


        var initializedFiles =
            0;


        foreach
        (
            var filePath in files
        )
        {
            if
            (
                string.IsNullOrWhiteSpace
                (
                    filePath
                )
            )
            {
                continue;
            }


            //===================================================
            // Initialize Must Not Create Missing Source Files
            //===================================================

            if
            (
                !File.Exists
                (
                    filePath
                )
            )
            {
                continue;
            }


            var baselinePath =
                GetExistingBaselinePath
                (
                    filePath,

                    codeSynchronization.SynchronizationType,

                    codeSynchronization.ModuleName
                );


            if
            (
                string.IsNullOrWhiteSpace
                (
                    baselinePath
                )
            )
            {
                continue;
            }


            if
            (
                !File.Exists
                (
                    baselinePath
                )
            )
            {
                continue;
            }


            var modified =
                await IsFileModifiedAsync
                (
                    filePath,

                    baselinePath
                );


            //===================================================
            // Only Modified Files Need Initialization
            //===================================================

            if
            (
                !modified
            )
            {
                continue;
            }


            modifiedFiles++;


            //===================================================
            // Initialize:
            //
            // Baseline
            //    ↓
            // Existing Source
            //===================================================

            var baselineBytes =
                await File.ReadAllBytesAsync
                (
                    baselinePath
                );


            await File.WriteAllBytesAsync
            (
                filePath,

                baselineBytes
            );


            //===================================================
            // Preserve Baseline Timestamp
            //===================================================

            File.SetLastWriteTimeUtc
            (
                filePath,

                File.GetLastWriteTimeUtc
                (
                    baselinePath
                )
            );


            //===================================================
            // Verify
            //===================================================

            var stillModified =
                await IsFileModifiedAsync
                (
                    filePath,

                    baselinePath
                );


            if
            (
                stillModified
            )
            {
                return false;
            }


            initializedFiles++;
        }


        return
            modifiedFiles > 0
            &&
            initializedFiles ==
                modifiedFiles;
    }



    //===========================================================
    // Restore File
    //===========================================================

    public async Task<bool>
        RestoreFileAsync
    (
        long id,

        string fileName
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return false;
        }


        if
        (
            !codeSynchronization.LastSynchronizedDate.HasValue
        )
        {
            return false;
        }


        var files =
            await GetSynchronizationFilePathsAsync
            (
                id,

                fileName
            );


        if
        (
            files.Count !=
            1
        )
        {
            return false;
        }


        var restored =
            false;


        foreach
        (
            var filePath in files
        )
        {
            if
            (
                string.IsNullOrWhiteSpace
                (
                    filePath
                )
            )
            {
                continue;
            }


            if
            (
                !File.Exists
                (
                    filePath
                )
            )
            {
                continue;
            }


            var restorePath =
                GetExistingRestorePath
                (
                    filePath,

                    codeSynchronization.SynchronizationType,

                    codeSynchronization.ModuleName
                );


            if
            (
                string.IsNullOrWhiteSpace
                (
                    restorePath
                )
            )
            {
                continue;
            }


            if
            (
                !File.Exists
                (
                    restorePath
                )
            )
            {
                continue;
            }


            var modified =
                await IsFileModifiedAsync
                (
                    filePath,

                    restorePath
                );


            if
            (
                !modified
            )
            {
                continue;
            }


            //===================================================
            // Restore:
            //
            // Latest Protected Restore/Baseline State
            //        ↓
            // Existing Source File
            //
            // No new source file is created.
            //===================================================

            File.Copy
            (
                restorePath,

                filePath,

                true
            );


            File.SetLastWriteTimeUtc
            (
                filePath,

                File.GetLastWriteTimeUtc
                (
                    restorePath
                )
            );


            restored =
                true;
        }


        return restored;
    }



    //===========================================================
    // Restore All
    //===========================================================

    public async Task<bool>
        RestoreAllFilesAsync
    (
        long id
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return false;
        }


        if
        (
            !codeSynchronization.LastSynchronizedDate.HasValue
        )
        {
            return false;
        }


        var files =
            await GetSynchronizationFilePathsAsync
            (
                id
            );


        var restored =
            false;


        foreach
        (
            var filePath in files
        )
        {
            if
            (
                string.IsNullOrWhiteSpace
                (
                    filePath
                )
            )
            {
                continue;
            }


            if
            (
                !File.Exists
                (
                    filePath
                )
            )
            {
                continue;
            }


            var restorePath =
                GetExistingRestorePath
                (
                    filePath,

                    codeSynchronization.SynchronizationType,

                    codeSynchronization.ModuleName
                );


            if
            (
                string.IsNullOrWhiteSpace
                (
                    restorePath
                )
            )
            {
                continue;
            }


            if
            (
                !File.Exists
                (
                    restorePath
                )
            )
            {
                continue;
            }


            var modified =
                await IsFileModifiedAsync
                (
                    filePath,

                    restorePath
                );


            if
            (
                !modified
            )
            {
                continue;
            }


            File.Copy
            (
                restorePath,

                filePath,

                true
            );


            File.SetLastWriteTimeUtc
            (
                filePath,

                File.GetLastWriteTimeUtc
                (
                    restorePath
                )
            );


            restored =
                true;
        }


        return restored;
    }



    //===========================================================
    // Get Synchronization File Paths
    //===========================================================

    private async Task<List<string>>
        GetSynchronizationFilePathsAsync
    (
        long id,

        string? fileName = null
    )
    {
        var codeSynchronization =
            await _context.CodeSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            codeSynchronization == null
        )
        {
            return [];
        }


        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        codeSynchronization.SubmenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            return [];
        }


        //=======================================================
        // Normalize Requested File Name
        //=======================================================

        var requestedFileName =
            string.IsNullOrWhiteSpace
            (
                fileName
            )
                ? null
                : Path.GetFileName
                (
                    fileName.Trim()
                );


        //=======================================================
        // Frontend Files
        //=======================================================

        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var files =
                new List<string>
                {
                    submenuSynchronization.FrontendSubmenuModelFile,

                    submenuSynchronization.FrontendSubmenuServiceFile,

                    submenuSynchronization.FrontendSubmenuRouteFile,

                    submenuSynchronization.FrontendSubmenuFormTsFile,

                    submenuSynchronization.FrontendSubmenuFormHtmlFile,

                    submenuSynchronization.FrontendSubmenuFormCssFile,

                    submenuSynchronization.FrontendSubmenuListTsFile,

                    submenuSynchronization.FrontendSubmenuListHtmlFile,

                    submenuSynchronization.FrontendSubmenuListCssFile
                };


            return files

                .Where
                (
                    x =>
                        !string.IsNullOrWhiteSpace
                        (
                            x
                        )
                )

                .Where
                (
                    x =>
                        requestedFileName == null

                        ||

                        string.Equals
                        (
                            Path.GetFileName
                            (
                                x
                            ),

                            requestedFileName,

                            StringComparison.OrdinalIgnoreCase
                        )
                )

                .Select
                (
                    x =>
                        Path.GetFullPath
                        (
                            x
                        )
                )

                .ToList();
        }


        //=======================================================
        // Backend Files
        //=======================================================

        if
        (
            string.Equals
            (
                codeSynchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var files =
                new List<string>
                {
                    submenuSynchronization.BackendControllerFile,

                    submenuSynchronization.BackendSubMenuDtoFile,

                    submenuSynchronization.BackendCreateSubMenuDtoFile,

                    submenuSynchronization.BackendUpdateSubMenuDtoFile,

                    submenuSynchronization.BackendSubMenuDefaultsDtoFile,

                    submenuSynchronization.BackendSubMenuRepositoryInterfaceFile,

                    submenuSynchronization.BackendSubMenuEntityFile,

                    submenuSynchronization.BackendSubMenuConfigurationFile,

                    submenuSynchronization.BackendSubMenuRepositoryFile
                };


            return files

                .Where
                (
                    x =>
                        !string.IsNullOrWhiteSpace
                        (
                            x
                        )
                )

                .Where
                (
                    x =>
                        requestedFileName == null

                        ||

                        string.Equals
                        (
                            Path.GetFileName
                            (
                                x
                            ),

                            requestedFileName,

                            StringComparison.OrdinalIgnoreCase
                        )
                )

                .Select
                (
                    x =>
                        Path.GetFullPath
                        (
                            x
                        )
                )

                .ToList();
        }


        return [];
    }

    //===========================================================
    // Get Baseline Path
    //===========================================================

    private static string
        GetBaselinePath
    (
        string filePath,

        string? synchronizationType = null,

        string? moduleName = null
    )
    {
        var fullPath =
            Path.GetFullPath
            (
                filePath
            );


        var fileName =
            Path.GetFileName
            (
                fullPath
            );


        var directory =
            Path.GetDirectoryName
            (
                fullPath
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                directory
            )
        )
        {
            return
                $"{fullPath}.appcore-sync-baseline";
        }


        var directoryInfo =
            new DirectoryInfo
            (
                directory
            );


        //=======================================================
        // Frontend Synchronization Backup
        //
        // The Frontend Code Synchronization Engine stores the
        // protected baseline under:
        //
        // src
        //     development_backup
        //         baseline-files
        //             <module-kebab-case>
        //                 <File>.appcore-sync-baseline
        //
        // The module folder uses the synchronization definition's
        // ModuleName, normalized exactly to kebab-case.
        //=======================================================

        if
        (
            string.Equals
            (
                synchronizationType,

                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var srcDirectory =
                directoryInfo;


            while
            (
                srcDirectory != null
            )
            {
                if
                (
                    string.Equals
                    (
                        srcDirectory.Name,

                        "src",

                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    var normalizedModuleName =
                        ToKebabCase
                        (
                            moduleName ?? string.Empty
                        );


                    if
                    (
                        string.IsNullOrWhiteSpace
                        (
                            normalizedModuleName
                        )
                    )
                    {
                        throw new InvalidOperationException
                        (
                            "Frontend module name could not be determined for baseline path."
                        );
                    }


                    return Path.Combine
                    (
                        srcDirectory.FullName,

                        "development_backup",

                        "baseline-files",

                        normalizedModuleName,

                        $"{fileName}.appcore-sync-baseline"
                    );
                }


                srcDirectory =
                    srcDirectory.Parent;
            }


            throw new InvalidOperationException
            (
                $"Frontend src directory could not be determined from target file: {fullPath}"
            );
        }


        //=======================================================
        // Backend
        //
        // IMPORTANT:
        //
        // Backend generated source files can be nested below the
        // project root. The synchronization definition already
        // contains the exact source file locations.
        //
        // Therefore the backup path MUST NOT depend on the first
        // directory segment of the source file.
        //
        // The generated backend backup locations are fixed by
        // backend project and source category.
        //
        // The synchronization ModuleName is used for the backup
        // module folder.
        //=======================================================

        if
        (
            string.Equals
            (
                synchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var backupModuleName =
                CreateBackendBackupFolderName
                (
                    moduleName ?? string.Empty
                );


            if
            (
                string.IsNullOrWhiteSpace
                (
                    backupModuleName
                )
            )
            {
                throw new InvalidOperationException
                (
                    "Backend module name could not be determined for baseline path."
                );
            }


            //===================================================
            // Backend API
            //===================================================

            var apiProject =
                FindProjectDirectory
                (
                    directory,

                    "AppCore.API"
                );


            if
            (
                apiProject != null
            )
            {
                var relativePath =
                    Path.GetRelativePath
                    (
                        apiProject,

                        fullPath
                    );


                var relativeParts =
                    GetPathParts
                    (
                        relativePath
                    );


                if
                (
                    ContainsPathSegment
                    (
                        relativeParts,

                        "Controllers"
                    )
                )
                {
                    return Path.Combine
                    (
                        apiProject,

                        "Development_Backup",

                        "Baseline_Files",

                        backupModuleName,

                        $"{fileName}.appcore-sync-baseline"
                    );
                }
            }


            //===================================================
            // Backend Application DTOs
            //===================================================

            var applicationProject =
                FindProjectDirectory
                (
                    directory,

                    "AppCore.Application"
                );


            if
            (
                applicationProject != null
            )
            {
                var relativePath =
                    Path.GetRelativePath
                    (
                        applicationProject,

                        fullPath
                    );


                var relativeParts =
                    GetPathParts
                    (
                        relativePath
                    );


                if
                (
                    ContainsPathSegment
                    (
                        relativeParts,

                        "DTOs"
                    )
                )
                {
                    return Path.Combine
                    (
                        applicationProject,

                        "Development_Backup",

                        "Baseline_Files",

                        "DTOs",

                        backupModuleName,

                        $"{fileName}.appcore-sync-baseline"
                    );
                }


                //===================================================
                // Backend Application Interfaces
                //===================================================

                if
                (
                    ContainsPathSegment
                    (
                        relativeParts,

                        "Interfaces"
                    )
                )
                {
                    return Path.Combine
                    (
                        applicationProject,

                        "Development_Backup",

                        "Baseline_Files",

                        "Interfaces",

                        backupModuleName,

                        $"{fileName}.appcore-sync-baseline"
                    );
                }
            }


            //===================================================
            // Backend Domain
            //===================================================

            var domainProject =
                FindProjectDirectory
                (
                    directory,

                    "AppCore.Domain"
                );


            if
            (
                domainProject != null
            )
            {
                var relativePath =
                    Path.GetRelativePath
                    (
                        domainProject,

                        fullPath
                    );


                var relativeParts =
                    GetPathParts
                    (
                        relativePath
                    );


                //===================================================
                // The entity file location is taken from the
                // synchronization definition itself.
                //
                // Do NOT require an "Entities" directory segment.
                // The AppCore.Domain entity can be located directly
                // under the domain project or inside any nested
                // domain folder.
                //===================================================

                if
                (
                    IsPathInsideProject
                    (
                        fullPath,

                        domainProject
                    )
                )
                {
                    return Path.Combine
                    (
                        domainProject,

                        "Development_Backup",

                        "Baseline_Files",

                        backupModuleName,

                        $"{fileName}.appcore-sync-baseline"
                    );
                }
            }


            //===================================================
            // Backend Infrastructure Configuration / Repository
            //===================================================

            var infrastructureProject =
                FindProjectDirectory
                (
                    directory,

                    "AppCore.Infrastructure"
                );


            if
            (
                infrastructureProject != null
            )
            {
                var relativePath =
                    Path.GetRelativePath
                    (
                        infrastructureProject,

                        fullPath
                    );


                var relativeParts =
                    GetPathParts
                    (
                        relativePath
                    );


                if
                (
                    ContainsPathSegment
                    (
                        relativeParts,

                        "Configurations"
                    )
                )
                {
                    return Path.Combine
                    (
                        infrastructureProject,

                        "Development_Backup",

                        "Baseline_Files",

                        "Configurations",

                        backupModuleName,

                        $"{fileName}.appcore-sync-baseline"
                    );
                }


                if
                (
                    ContainsPathSegment
                    (
                        relativeParts,

                        "Repositories"
                    )
                )
                {
                    return Path.Combine
                    (
                        infrastructureProject,

                        "Development_Backup",

                        "Baseline_Files",

                        "Repositories",

                        backupModuleName,

                        $"{fileName}.appcore-sync-baseline"
                    );
                }
            }
        }


        //=======================================================
        // Fallback
        //
        // Unknown paths retain the existing source-side
        // baseline behavior.
        //
        //=======================================================

        return
            $"{fullPath}.appcore-sync-baseline";
    }



    //===========================================================
    // Get Path Parts
    //===========================================================

    private static List<string>
        GetPathParts
    (
        string relativePath
    )
    {
        return relativePath
            .Split
            (
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar
            )
            .Where
            (
                x =>
                    !string.IsNullOrWhiteSpace
                    (
                        x
                    )
            )
            .ToList();
    }



    //===========================================================
    // Contains Path Segment
    //===========================================================

    private static bool
        ContainsPathSegment
    (
        IEnumerable<string> pathParts,

        string segment
    )
    {
        return pathParts.Any
        (
            x =>
                string.Equals
                (
                    x,

                    segment,

                    StringComparison.OrdinalIgnoreCase
                )
        );
    }



    //===========================================================
    // Is Path Inside Project
    //===========================================================

    private static bool
        IsPathInsideProject
    (
        string filePath,

        string projectPath
    )
    {
        var fullFilePath =
            Path.GetFullPath
            (
                filePath
            );


        var fullProjectPath =
            Path.GetFullPath
            (
                projectPath
            );


        var projectRoot =
            fullProjectPath
                .TrimEnd
                (
                    Path.DirectorySeparatorChar,

                    Path.AltDirectorySeparatorChar
                )
                +
                Path.DirectorySeparatorChar;


        return
            fullFilePath.StartsWith
            (
                projectRoot,

                StringComparison.OrdinalIgnoreCase
            )
            ||
            string.Equals
            (
                fullFilePath,

                fullProjectPath,

                StringComparison.OrdinalIgnoreCase
            );
    }



    //===========================================================
    // Get Existing Baseline Path
    //===========================================================

    private static string?
        GetExistingBaselinePath
    (
        string filePath,

        string? synchronizationType = null,

        string? moduleName = null
    )
    {
        var protectedBaselinePath =
            GetBaselinePath
            (
                filePath,

                synchronizationType,

                moduleName
            );


        //=======================================================
        // Primary Protected Baseline
        //
        // The protected synchronization baseline is the
        // authoritative baseline location.
        //
        //=======================================================

        if
        (
            File.Exists
            (
                protectedBaselinePath
            )
        )
        {
            return
                protectedBaselinePath;
        }


        return null;
    }



    //===========================================================
    // Get Restore Path
    //===========================================================

    private static string
        GetRestorePath
    (
        string filePath,

        string? synchronizationType = null,

        string? moduleName = null
    )
    {
        var fullPath =
            Path.GetFullPath
            (
                filePath
            );


        if
        (
            string.Equals
            (
                synchronizationType,

                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var baselinePath =
                GetBaselinePath
                (
                    fullPath,

                    synchronizationType,

                    moduleName
                );


            return
                baselinePath
                    .Replace
                    (
                        $"{Path.DirectorySeparatorChar}development_backup{Path.DirectorySeparatorChar}baseline-files{Path.DirectorySeparatorChar}",

                        $"{Path.DirectorySeparatorChar}development_backup{Path.DirectorySeparatorChar}restore-files{Path.DirectorySeparatorChar}",

                        StringComparison.OrdinalIgnoreCase
                    )
                    .Replace
                    (
                        ".appcore-sync-baseline",

                        ".appcore-sync-restore",

                        StringComparison.OrdinalIgnoreCase
                    );
        }


        if
        (
            string.Equals
            (
                synchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var baselinePath =
                GetBaselinePath
                (
                    fullPath,

                    synchronizationType,

                    moduleName
                );


            return
                baselinePath
                    .Replace
                    (
                        $"{Path.DirectorySeparatorChar}Development_Backup{Path.DirectorySeparatorChar}Baseline_Files{Path.DirectorySeparatorChar}",

                        $"{Path.DirectorySeparatorChar}Development_Backup{Path.DirectorySeparatorChar}Restore_Files{Path.DirectorySeparatorChar}",

                        StringComparison.OrdinalIgnoreCase
                    )
                    .Replace
                    (
                        ".appcore-sync-baseline",

                        ".appcore-sync-restore",

                        StringComparison.OrdinalIgnoreCase
                    );
        }


        return
            $"{fullPath}.appcore-sync-restore";
    }



    //===========================================================
    // Get Existing Restore Path
    //===========================================================

    private static string?
        GetExistingRestorePath
    (
        string filePath,

        string? synchronizationType = null,

        string? moduleName = null
    )
    {
        var restorePath =
            GetRestorePath
            (
                filePath,

                synchronizationType,

                moduleName
            );


        if
        (
            File.Exists
            (
                restorePath
            )
        )
        {
            return
                restorePath;
        }


        return null;
    }



    //===========================================================
    // Find Project Directory
    //===========================================================

    private static string?
        FindProjectDirectory
    (
        string directory,

        string projectName
    )
    {
        var current =
            new DirectoryInfo
            (
                directory
            );


        while
        (
            current != null
        )
        {
            if
            (
                string.Equals
                (
                    current.Name,

                    projectName,

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return
                    current.FullName;
            }


            current =
                current.Parent;
        }


        return null;
    }

    //===========================================================
    // To Kebab Case
    //===========================================================

    private static string
        ToKebabCase
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(value)
        )
        {
            return string.Empty;
        }


        var result =
            new System.Text.StringBuilder();


        var pendingSeparator =
            false;


        foreach
        (
            var character in value.Trim()
        )
        {
            if
            (
                char.IsLetterOrDigit(character)
            )
            {
                if
                (
                    pendingSeparator
                    &&
                    result.Length > 0
                )
                {
                    result.Append('-');
                }


                result.Append(
                    char.ToLowerInvariant(character)
                );


                pendingSeparator =
                    false;

                continue;
            }


            if
            (
                result.Length > 0
            )
            {
                pendingSeparator =
                    true;
            }
        }


        return result
            .ToString()
            .Trim('-');
    }



    //===========================================================
    // Create Backend Backup Folder Name
    //===========================================================

    private static string
        CreateBackendBackupFolderName
    (
        string moduleName
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(moduleName)
        )
        {
            return string.Empty;
        }


        return new string
        (
            moduleName
                .Where(
                    char.IsLetterOrDigit
                )
                .ToArray()
        );
    }



    //===========================================================
    // Get Module Name
    //===========================================================

    private static string
        GetModuleName
    (
        string directory
    )
    {
        var directoryInfo =
            new DirectoryInfo
            (
                directory
            );


        if
        (
            directoryInfo.Parent == null
        )
        {
            return directoryInfo.Name;
        }


        return directoryInfo.Parent.Name;
    }



    //===========================================================
    // Determine File Modification
    //===========================================================

    private static async Task<bool>
        IsFileModifiedAsync
    (
        string filePath,

        string baselinePath
    )
    {
        if
        (
            !File.Exists
            (
                baselinePath
            )
        )
        {
            return false;
        }


        if
        (
            !File.Exists
            (
                filePath
            )
        )
        {
            return true;
        }


        var currentBytes =
            await File.ReadAllBytesAsync
            (
                filePath
            );


        var baselineBytes =
            await File.ReadAllBytesAsync
            (
                baselinePath
            );


        return !currentBytes.SequenceEqual
        (
            baselineBytes
        );
    }



    //===========================================================
    // Build Frontend Files
    //===========================================================

    private static async Task<List<CodeSynchronizationFileDto>>
        BuildFrontendFilesAsync
    (
        AppCore.Domain.Entities.InfrastructureControl
            .DevelopmentManagement.SubmenuSynchronization synchronization,

        string synchronizationType,

        string moduleName,

        DateTime? lastSynchronizedDate
    )
    {
        var files =
            new List<string>
            {
                synchronization.FrontendSubmenuModelFile,

                synchronization.FrontendSubmenuServiceFile,

                synchronization.FrontendSubmenuRouteFile,

                synchronization.FrontendSubmenuFormTsFile,

                synchronization.FrontendSubmenuFormHtmlFile,

                synchronization.FrontendSubmenuFormCssFile,

                synchronization.FrontendSubmenuListTsFile,

                synchronization.FrontendSubmenuListHtmlFile,

                synchronization.FrontendSubmenuListCssFile
            };


        return await BuildFileListAsync
        (
            files,

            synchronizationType,

            moduleName,

            lastSynchronizedDate
        );
    }



    //===========================================================
    // Build Backend Files
    //===========================================================

    private static async Task<List<CodeSynchronizationFileDto>>
        BuildBackendFilesAsync
    (
        AppCore.Domain.Entities.InfrastructureControl
            .DevelopmentManagement.SubmenuSynchronization synchronization,

        string synchronizationType,

        string moduleName,

        DateTime? lastSynchronizedDate
    )
    {
        var files =
            new List<string>
            {
                synchronization.BackendControllerFile,

                synchronization.BackendSubMenuDtoFile,

                synchronization.BackendCreateSubMenuDtoFile,

                synchronization.BackendUpdateSubMenuDtoFile,

                synchronization.BackendSubMenuDefaultsDtoFile,

                synchronization.BackendSubMenuRepositoryInterfaceFile,

                synchronization.BackendSubMenuEntityFile,

                synchronization.BackendSubMenuConfigurationFile,

                synchronization.BackendSubMenuRepositoryFile
            };


        return await BuildFileListAsync
        (
            files,

            synchronizationType,

            moduleName,

            lastSynchronizedDate
        );
    }



    //===========================================================
    // Build File List
    //===========================================================

    private static async Task<List<CodeSynchronizationFileDto>>
        BuildFileListAsync
    (
        IEnumerable<string> filePaths,

        string synchronizationType,

        string moduleName,

        DateTime? lastSynchronizedDate
    )
    {
        var result =
            new List<CodeSynchronizationFileDto>();


        foreach
        (
            var filePath in filePaths
        )
        {
            if
            (
                string.IsNullOrWhiteSpace
                (
                    filePath
                )
            )
            {
                continue;
            }


            var fullPath =
                Path.GetFullPath
                (
                    filePath
                );


            var fileName =
                Path.GetFileName
                (
                    fullPath
                );


            if
            (
                string.IsNullOrWhiteSpace
                (
                    fileName
                )
            )
            {
                continue;
            }


            DateTime?
                lastModified =
                    null;


            if
            (
                File.Exists
                (
                    fullPath
                )
            )
            {
                lastModified =
                    File.GetLastWriteTime
                    (
                        fullPath
                    );
            }


            var status =
                "Clean";


            var baselinePath =
                GetExistingBaselinePath
                (
                    fullPath,

                    synchronizationType,

                    moduleName
                );


            if
            (
                !File.Exists
                (
                    fullPath
                )
            )
            {
                status =
                    "Modified";
            }

            else if
            (
                !string.IsNullOrWhiteSpace
                (
                    baselinePath
                )

                &&

                File.Exists
                (
                    baselinePath
                )
            )
            {
                var modified =
                    await IsFileModifiedAsync
                    (
                        fullPath,

                        baselinePath
                    );


                if
                (
                    modified
                )
                {
                    status =
                        "Modified";
                }
            }


            result.Add
            (
                new CodeSynchronizationFileDto
                {
                    FileName =
                        fileName,

                    Status =
                        status,

                    LastModified =
                        lastModified
                }
            );
        }


        return result;
    }



    //===========================================================
    // Synchronize Code
    //===========================================================

    public async Task<bool>
        SynchronizeAsync
    (
        long id
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            throw new InvalidOperationException
            (
                "The Code Synchronization record was not found."
            );
        }


        //=======================================================
        // Set Build Status To Pending Before Synchronization
        //=======================================================

        synchronization.BuildStatus =
            "Pending";


        //=======================================================
        // Backend Database Registration Remains Pending
        //=======================================================

        if
        (
            string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            synchronization.DbStatus =
                "Pending";


            synchronization.MigrationStatus =
                "Ready";


            synchronization.DatabaseCreated =
                false;
        }
        else
        {
            synchronization.DbStatus =
                "N/A";


            synchronization.MigrationStatus =
                "N/A";


            synchronization.DatabaseCreated =
                false;
        }


        await _context.SaveChangesAsync();


        //=======================================================
        // Execute Code Synchronization
        //=======================================================

        var result =
            await _codeSynchronizationEngine
                .SynchronizeAsync
                (
                    id
                );


        //=======================================================
        // Build Result
        //=======================================================

        synchronization.BuildStatus =
            result.Success
                ? "Successful"
                : "Failed";


        synchronization.LastSynchronizationResult =
            result.Message;


        //=======================================================
        // Code Synchronization Status
        //=======================================================

        synchronization.Status =
            result.Success
                ? "Synchronized"
                : "Failed";


        //=======================================================
        // Failed Build
        //=======================================================

        if
        (
            !result.Success
        )
        {
            await _context.SaveChangesAsync();


            throw new InvalidOperationException
            (
                result.Message
            );
        }


        //=======================================================
        // Successful Synchronization
        //=======================================================

        synchronization.LastSynchronizedDate =
            DateTime.UtcNow;


        //=======================================================
        // Backend Status
        //=======================================================

        if
        (
            string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            synchronization.DbStatus =
                "Pending";


            synchronization.MigrationStatus =
                "Ready";


            synchronization.DatabaseCreated =
                false;
        }
        else
        {
            synchronization.DbStatus =
                "N/A";


            synchronization.MigrationStatus =
                "N/A";


            synchronization.DatabaseCreated =
                false;
        }


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Update Backend Registration Status
    //===========================================================

    public async Task<bool>
        UpdateBackendRegistrationStatusAsync
    (
        long id,

        bool successful,

        string message
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return false;
        }


        if
        (
            !string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return false;
        }


        synchronization.DbStatus =
            successful
                ? "Registered"
                : "Failed";


        synchronization.LastSynchronizationResult =
            string.IsNullOrWhiteSpace
            (
                message
            )
                ? (
                    successful
                        ? "Backend database registration completed successfully."
                        : "Backend database registration failed."
                )
                : message.Trim();


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Update Backend Deregistration Status
    //===========================================================

    public async Task<bool>
        UpdateBackendDeregistrationStatusAsync
    (
        long id,

        string message
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return false;
        }


        if
        (
            !string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return false;
        }


        //=======================================================
        // Database Registration Is Removed
        //=======================================================

        synchronization.DbStatus =
            "Pending";


        //=======================================================
        // Code Remains Synchronized
        //=======================================================

        synchronization.Status =
            "Synchronized";


        //=======================================================
        // Build Remains Successful
        //=======================================================

        synchronization.BuildStatus =
            "Successful";


        //=======================================================
        // Save Deregistration Result
        //=======================================================

        synchronization.LastSynchronizationResult =
            string.IsNullOrWhiteSpace
            (
                message
            )
                ? "Backend database deregistration completed successfully."
                : message.Trim();


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Update Migration Status
    //===========================================================

    public async Task<bool>
        UpdateMigrationStatusAsync
    (
        long id,

        bool successful,

        string message
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return false;
        }


        if
        (
            !string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return false;
        }


        //=======================================================
        // Migration State
        //
        // Migration state is completely independent from
        // DatabaseCreated.
        //=======================================================

        synchronization.MigrationStatus =
            successful
                ? "Created"
                : "Failed";


        synchronization.LastSynchronizationResult =
            string.IsNullOrWhiteSpace
            (
                message
            )
                ? (
                    successful
                        ? "Database migration completed successfully."
                        : "Database migration failed."
                )
                : message.Trim();


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Update Migration Removal Status
    //===========================================================

    public async Task<bool>
        UpdateMigrationRemovalStatusAsync
    (
        long id,

        string message
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return false;
        }


        if
        (
            !string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return false;
        }


        //=======================================================
        // Migration Is Removed
        //=======================================================

        synchronization.MigrationStatus =
            "Ready";


        //=======================================================
        // Migration Removal Can Only Exist Without The
        // Database Table
        //
        // DatabaseCreated is therefore reset here only because
        // the migration removal workflow has already completed.
        //=======================================================

        synchronization.DatabaseCreated =
            false;


        //=======================================================
        // Code Remains Synchronized
        //=======================================================

        synchronization.Status =
            "Synchronized";


        synchronization.BuildStatus =
            "Successful";


        //=======================================================
        // Save Migration Removal Result
        //=======================================================

        synchronization.LastSynchronizationResult =
            string.IsNullOrWhiteSpace
            (
                message
            )
                ? "Database migration removed successfully."
                : message.Trim();


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Update Database Status
    //===========================================================
    //
    // DatabaseCreated is updated only after the actual
    // Database Creation Engine operation has completed
    // successfully.
    //
    // Migration creation does not call this method.
    //
    //===========================================================

    public async Task<bool>
        UpdateDatabaseStatusAsync
    (
        long id,

        bool successful,

        string message
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            return false;
        }


        if
        (
            !string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return false;
        }


        //=======================================================
        // Database State
        //=======================================================

        synchronization.DatabaseCreated =
            successful;


        //=======================================================
        // Save Database Operation Result
        //=======================================================

        synchronization.LastSynchronizationResult =
            string.IsNullOrWhiteSpace
            (
                message
            )
                ? (
                    successful
                        ? "Database operation completed successfully."
                        : "Database operation failed."
                )
                : message.Trim();


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Rollback Code Synchronization
    //===========================================================

    public async Task<bool>
        RollbackAsync
    (
        long id
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            throw new InvalidOperationException
            (
                "The Code Synchronization record was not found."
            );
        }


        //=======================================================
        // Backend Registration Protection
        //=======================================================

        if
        (
            string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )

            &&

            string.Equals
            (
                synchronization.DbStatus,

                "Registered",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException
            (
                "Code Synchronization rollback is not allowed while the backend database is registered. Deregister the backend database first."
            );
        }


        //=======================================================
        // Execute Code Rollback
        //=======================================================

        var result =
            await _codeSynchronizationEngine
                .RollbackAsync
                (
                    id
                );


        //=======================================================
        // Rollback Failed
        //=======================================================

        if
        (
            !result.Success
        )
        {
            synchronization.BuildStatus =
                "Failed";


            synchronization.Status =
                "Failed";


            synchronization.LastSynchronizationResult =
                result.Message;


            await _context.SaveChangesAsync();


            throw new InvalidOperationException
            (
                result.Message
            );
        }


        //=======================================================
        // Rollback Successful
        //=======================================================

        synchronization.BuildStatus =
            "Pending";


        synchronization.Status =
            "Ready";


        synchronization.LastSynchronizationResult =
            result.Message;


        //=======================================================
        // Backend Status Reset
        //=======================================================

        if
        (
            string.Equals
            (
                synchronization.SynchronizationType,

                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            synchronization.DbStatus =
                "Pending";


            synchronization.MigrationStatus =
                "Ready";


            synchronization.DatabaseCreated =
                false;
        }
        else
        {
            synchronization.DbStatus =
                "N/A";


            synchronization.MigrationStatus =
                "N/A";


            synchronization.DatabaseCreated =
                false;
        }


        await _context.SaveChangesAsync();


        return true;
    }



    //===========================================================
    // Create From Submenu Synchronization
    //===========================================================

    public async Task<long>
        CreateFromSubmenuSynchronizationAsync
    (
        long submenuSynchronizationId
    )
    {
        const long userId =
            1;


        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        submenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            throw new InvalidOperationException
            (
                "The Submenu Synchronization record was not found."
            );
        }


        if
        (
            !string.Equals
            (
                submenuSynchronization.Status,

                "Synchronized",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization cannot be created because Submenu Synchronization for '{submenuSynchronization.SubmenuName}' is not synchronized."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.SynchronizationType
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization cannot be created because the synchronization type for '{submenuSynchronization.SubmenuName}' is not configured."
            );
        }


        var synchronizationType =
            submenuSynchronization
                .SynchronizationType
                .Trim();


        //=======================================================
        // One Code Synchronization Record Belongs To One
        // Submenu Synchronization Base.
        //
        // The generated file name is NOT used to replace or
        // collapse the nine generated files. Each generated
        // file remains identified by its own FileName in the
        // file list returned by GetFilesAsync.
        //=======================================================

        var existing =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.SubmenuSynchronizationId ==
                        submenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existing != null
        )
        {
            existing.SynchronizationType =
                synchronizationType;


            existing.ModuleId =
                submenuSynchronization.ModuleId;

            existing.ModuleCode =
                submenuSynchronization.ModuleCode;

            existing.ModuleName =
                submenuSynchronization.ModuleName;


            existing.MenuId =
                submenuSynchronization.MenuId;

            existing.MenuCode =
                submenuSynchronization.MenuCode;

            existing.MenuName =
                submenuSynchronization.MenuName;


            existing.SubmenuId =
                submenuSynchronization.SubmenuId;

            existing.SubmenuCode =
                submenuSynchronization.SubmenuCode;

            existing.SubmenuName =
                submenuSynchronization.SubmenuName;


            existing.Remarks =
                submenuSynchronization.Remarks;


            existing.BuildStatus =
                "Pending";


            if
            (
                string.Equals
                (
                    synchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                existing.DbStatus =
                    "Pending";


                existing.MigrationStatus =
                    "Ready";


                existing.DatabaseCreated =
                    false;
            }
            else
            {
                existing.DbStatus =
                    "N/A";


                existing.MigrationStatus =
                    "N/A";


                existing.DatabaseCreated =
                    false;
            }


            await _context.SaveChangesAsync();


            return existing.Id;
        }


        var synchronization =
            new CodeSynchronizationEntity
            {
                SubmenuSynchronizationId =
                    submenuSynchronization.Id,


                ModuleId =
                    submenuSynchronization.ModuleId,

                ModuleCode =
                    submenuSynchronization.ModuleCode,

                ModuleName =
                    submenuSynchronization.ModuleName,


                MenuId =
                    submenuSynchronization.MenuId,

                MenuCode =
                    submenuSynchronization.MenuCode,

                MenuName =
                    submenuSynchronization.MenuName,


                SubmenuId =
                    submenuSynchronization.SubmenuId,

                SubmenuCode =
                    submenuSynchronization.SubmenuCode,

                SubmenuName =
                    submenuSynchronization.SubmenuName,


                SynchronizationType =
                    synchronizationType,


                Status =
                    "Ready",


                BuildStatus =
                    "Pending",


                DbStatus =
                    string.Equals
                    (
                        synchronizationType,

                        "Backend",

                        StringComparison.OrdinalIgnoreCase
                    )
                        ? "Pending"
                        : "N/A",


                MigrationStatus =
                    string.Equals
                    (
                        synchronizationType,

                        "Backend",

                        StringComparison.OrdinalIgnoreCase
                    )
                        ? "Ready"
                        : "N/A",


                DatabaseCreated =
                    false,


                Remarks =
                    submenuSynchronization.Remarks,


                LastSynchronizedBy =
                    null,

                LastSynchronizedDate =
                    null,

                LastSynchronizationResult =
                    string.Empty,


                IsActive =
                    true,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context.CodeSynchronizations.Add
        (
            synchronization
        );


        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add
        (
            new ActivityHistory
            {
                Module =
                    "Infrastructure Control",

                EntityName =
                    "Code Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Code Synchronization Created",

                ActivityDescription =
                    $"Code synchronization record created for '{synchronization.SubmenuName}'.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return synchronization.Id;
    }



    //===========================================================
    // Get History
    //===========================================================

    public async Task<List<CodeSynchronizationDto>>
        GetHistoryAsync()
    {
        return await _context.CodeSynchronizations

            .Where
            (
                x =>

                    !x.IsDeleted
            )

            .OrderByDescending
            (
                x =>
                    x.CreatedDate
            )

            .Select
            (
                x =>
                    new CodeSynchronizationDto
                    {
                        Id =
                            x.Id,

                        SubmenuSynchronizationId =
                            x.SubmenuSynchronizationId,

                        ModuleId =
                            x.ModuleId,

                        ModuleCode =
                            x.ModuleCode,

                        ModuleName =
                            x.ModuleName,

                        MenuId =
                            x.MenuId,

                        MenuCode =
                            x.MenuCode,

                        MenuName =
                            x.MenuName,

                        SubmenuId =
                            x.SubmenuId,

                        SubmenuCode =
                            x.SubmenuCode,

                        SubmenuName =
                            x.SubmenuName,

                        SynchronizationType =
                            _context.SubmenuSynchronizations

                                .Where
                                (
                                    submenu =>

                                        submenu.Id ==
                                        x.SubmenuSynchronizationId
                                )

                                .Select
                                (
                                    submenu =>
                                        submenu.SynchronizationType
                                )

                                .FirstOrDefault()
                                ?? string.Empty,


                        //===================================================
                        // Synchronization Status
                        //===================================================

                        Status =
                            x.Status,

                        BuildStatus =
                            x.BuildStatus,

                        DbStatus =
                            x.DbStatus,

                        MigrationStatus =
                            x.MigrationStatus,

                        DatabaseCreated =
                            x.DatabaseCreated,

                        Remarks =
                            x.Remarks,


                        //===================================================
                        // Last Synchronization
                        //===================================================

                        LastSynchronizedBy =
                            x.LastSynchronizedBy,

                        LastSynchronizedDate =
                            x.LastSynchronizedDate,

                        LastSynchronizationResult =
                            x.LastSynchronizationResult,


                        //===================================================
                        // General
                        //===================================================

                        IsActive =
                            x.IsActive,

                        CreatedDate =
                            x.CreatedDate
                    }
            )

            .ToListAsync();
    }

}