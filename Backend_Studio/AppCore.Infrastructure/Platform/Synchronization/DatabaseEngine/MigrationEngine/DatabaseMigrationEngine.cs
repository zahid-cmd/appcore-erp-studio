//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Database Migration Engine
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine
{

    //===========================================================
    // Database Migration Engine
    //===========================================================

    public sealed class DatabaseMigrationEngine : IDatabaseMigrationEngine
    {

        //=======================================================
        // Dependencies
        //=======================================================

        private readonly MigrationProjectResolver
            _projectResolver;


        private readonly MigrationNameBuilder
            _nameBuilder;


        private readonly MigrationCommandExecutor
            _commandExecutor;


        private readonly MigrationFileManager
            _fileManager;


        private readonly MigrationSnapshotManager
            _snapshotManager;


        private readonly MigrationValidator
            _validator;



        //=======================================================
        // Constructor
        //=======================================================

        public DatabaseMigrationEngine
        (
            MigrationProjectResolver projectResolver,

            MigrationNameBuilder nameBuilder,

            MigrationCommandExecutor commandExecutor,

            MigrationFileManager fileManager,

            MigrationSnapshotManager snapshotManager,

            MigrationValidator validator
        )
        {
            _projectResolver =
                projectResolver;


            _nameBuilder =
                nameBuilder;


            _commandExecutor =
                commandExecutor;


            _fileManager =
                fileManager;


            _snapshotManager =
                snapshotManager;


            _validator =
                validator;
        }



        //=======================================================
        // Create
        //=======================================================

        public async Task
            CreateAsync
        (
            long submenuId,

            string entityName
        )
        {
            //===================================================
            // Validate Creation State
            //===================================================

            _validator.ValidateSynchronizationId
            (
                submenuId
            );


            //===================================================
            // Validate Entity Name
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(entityName)
            )
            {
                throw new ArgumentException
                (
                    "Entity name is required.",
                    nameof(entityName)
                );
            }


            //===================================================
            // Resolve Migration Project
            //===================================================

            var project =
                await _projectResolver
                    .ResolveAsync
                    (
                        CancellationToken.None
                    );


            //===================================================
            // Validate Migration Project
            //===================================================

            _validator.ValidateProject
            (
                project
            );


            //===================================================
            // Build Migration Name
            //===================================================

            var migrationName =
                _nameBuilder.Build
                (
                    submenuId,

                    entityName
                );


            //===================================================
            // Validate Creation State
            //===================================================

            _validator.ValidateCreationState
            (
                project,

                submenuId
            );


            //===================================================
            // Validate Existing Migration State
            //===================================================

            var existingMigration =
                Directory
                    .GetFiles
                    (
                        project.MigrationsPath,

                        $"*AutoSync_{submenuId}_*.cs",

                        SearchOption.TopDirectoryOnly
                    );


            if
            (
                existingMigration.Length > 0
            )
            {
                throw new InvalidOperationException
                (
                    $"A migration already exists for Submenu ID {submenuId}."
                );
            }


            //===================================================
            // Native Snapshot
            //===================================================

            var snapshotFile =
                Path.Combine
                (
                    project.MigrationsPath,

                    "AppDbContextModelSnapshot.cs"
                );


            //===================================================
            // Backup Native Snapshot
            //===================================================

            var snapshotBackup =
                _snapshotManager
                    .BackupSnapshot
                    (
                        snapshotFile
                    );


            try
            {
                //===============================================
                // Create EF Core Migration
                //===============================================

                var arguments =
                    $"ef migrations add \"{migrationName}\" " +
                    $"--project \"{project.InfrastructureProjectFile}\" " +
                    $"--startup-project \"{project.ApiProjectFile}\"";


                var result =
                    await _commandExecutor
                        .ExecuteAsync
                        (
                            "dotnet",

                            arguments,

                            project.InfrastructureProject,

                            CancellationToken.None
                        );


                //===============================================
                // Validate Command Result
                //===============================================

                if
                (
                    !result.IsSuccess
                )
                {
                    throw new InvalidOperationException
                    (
                        $"EF Core migration creation failed.{Environment.NewLine}" +
                        $"Output: {result.StandardOutput}{Environment.NewLine}" +
                        $"Error: {result.StandardError}"
                    );
                }


                //===============================================
                // Locate Created Migration
                //===============================================

                var migration =
                    _fileManager.FindMigration
                    (
                        project.MigrationsPath,

                        submenuId
                    );


                //===============================================
                // Verify Migration Files
                //===============================================

                _fileManager.VerifyMigrationFiles
                (
                    migration
                );


                //===============================================
                // Verify Native Snapshot
                //===============================================

                _snapshotManager.VerifySnapshot
                (
                    snapshotFile
                );


                //===============================================
                // Validate Migration Creation
                //===============================================

                _validator.ValidateCreation
                (
                    migration,

                    snapshotFile
                );


                //===============================================
                // Do NOT restore the snapshot.
                //
                // EF Core has generated the migration and updated
                // the native snapshot.
                //
                // The updated snapshot must remain in place.
                //===============================================


                //===============================================
                // Remove Snapshot Backup
                //===============================================

                _snapshotManager.RemoveBackup
                (
                    snapshotBackup
                );
            }
            catch
            {
                //===============================================
                // Restore Native Snapshot
                //===============================================

                if
                (
                    File.Exists
                    (
                        snapshotBackup
                    )
                )
                {
                    _snapshotManager.RestoreSnapshot
                    (
                        snapshotFile,

                        snapshotBackup
                    );


                    //===========================================
                    // Remove Snapshot Backup
                    //===========================================

                    _snapshotManager.RemoveBackup
                    (
                        snapshotBackup
                    );
                }


                throw;
            }
        }



        //=======================================================
        // Remove
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
            // Resolve Migration Project
            //===================================================

            var project =
                await _projectResolver
                    .ResolveAsync
                    (
                        CancellationToken.None
                    );


            //===================================================
            // Validate Migration Project
            //===================================================

            _validator.ValidateProject
            (
                project
            );


            //===================================================
            // Locate Dedicated Migration
            //===================================================

            MigrationFileInfo migration;

            try
            {
                migration =
                    _fileManager.FindMigration
                    (
                        project.MigrationsPath,

                        submenuId
                    );
            }
            catch
            (
                FileNotFoundException exception
            )
            {
                //===================================================
                // Migration Already Removed
                //===================================================

                if
                (
                    string.Equals
                    (
                        exception.Message,

                        $"No migration was found for Submenu ID {submenuId}.",

                        StringComparison.Ordinal
                    )
                )
                {
                    return;
                }


                throw;
            }


            //===================================================
            // Validate Removal State
            //===================================================

            _validator.ValidateRemovalState
            (
                project,

                migration,

                submenuId
            );


            //===================================================
            // Verify Migration Files
            //===================================================

            _fileManager.VerifyMigrationFiles
            (
                migration
            );


            //===================================================
            // Native Snapshot
            //===================================================

            var snapshotFile =
                Path.Combine
                (
                    project.MigrationsPath,

                    "AppDbContextModelSnapshot.cs"
                );


            //===================================================
            // Verify Native Snapshot
            //===================================================

            _snapshotManager.VerifySnapshot
            (
                snapshotFile
            );


            //===================================================
            // Backup Native Snapshot
            //===================================================

            var snapshotBackup =
                _snapshotManager
                    .BackupSnapshot
                    (
                        snapshotFile
                    );


            try
            {
                //===============================================
                // Remove Migration Model From Snapshot
                //
                // IMPORTANT:
                //
                // Only the exact entity declaration block that
                // belongs to this migration is removed.
                //
                // No generic entity-name text matching is used.
                //===============================================

                RemoveMigrationModelFromSnapshot
                (
                    snapshotFile,

                    migration
                );


                //===============================================
                // Verify Native Snapshot
                //===============================================

                _snapshotManager.VerifySnapshot
                (
                    snapshotFile
                );


                //===============================================
                // Remove Dedicated Migration
                //===============================================

                _fileManager.RemoveMigrationFiles
                (
                    migration
                );


                //===============================================
                // Verify Migration Files Removed
                //===============================================

                _fileManager.VerifyMigrationFilesRemoved
                (
                    migration
                );


                //===============================================
                // Validate Migration Removal
                //===============================================

                _validator.ValidateRemoval
                (
                    migration,

                    snapshotFile
                );


                //===============================================
                // Remove Snapshot Backup
                //===============================================

                _snapshotManager.RemoveBackup
                (
                    snapshotBackup
                );
            }
            catch
            {
                //===============================================
                // Restore Native Snapshot
                //===============================================

                if
                (
                    File.Exists
                    (
                        snapshotBackup
                    )
                )
                {
                    _snapshotManager.RestoreSnapshot
                    (
                        snapshotFile,

                        snapshotBackup
                    );


                    //===========================================
                    // Remove Snapshot Backup
                    //===========================================

                    _snapshotManager.RemoveBackup
                    (
                        snapshotBackup
                    );
                }


                throw;
            }
        }



        //=======================================================
        // Remove Migration Model From Snapshot
        //=======================================================

        private static void
            RemoveMigrationModelFromSnapshot
        (
            string snapshotFile,

            MigrationFileInfo migration
        )
        {
            //===================================================
            // Validate Snapshot File
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(snapshotFile)
            )
            {
                throw new ArgumentException
                (
                    "Snapshot file path is required.",
                    nameof(snapshotFile)
                );
            }


            if
            (
                !File.Exists
                (
                    snapshotFile
                )
            )
            {
                throw new FileNotFoundException
                (
                    $"AppDbContextModelSnapshot.cs could not be found: {snapshotFile}"
                );
            }


            //===================================================
            // Validate Migration
            //===================================================

            if
            (
                migration == null
            )
            {
                throw new ArgumentNullException
                (
                    nameof(migration)
                );
            }


            //===================================================
            // Read Snapshot
            //===================================================

            var snapshot =
                File.ReadAllText
                (
                    snapshotFile
                );


            //===================================================
            // Build Migration Identity
            //===================================================

            var migrationIdentity =
                $"AutoSync_{migration.SubmenuId}_";


            //===================================================
            // Determine Entity Name
            //===================================================

            var migrationName =
                migration.MigrationName.Trim();


            var identityPosition =
                migrationName.IndexOf
                (
                    migrationIdentity,

                    StringComparison.OrdinalIgnoreCase
                );


            if
            (
                identityPosition < 0
            )
            {
                throw new InvalidOperationException
                (
                    $"Migration '{migration.MigrationName}' does not contain Synchronization ID {migration.SubmenuId}."
                );
            }


            var entityNameStart =
                identityPosition +
                migrationIdentity.Length;


            if
            (
                entityNameStart >= migrationName.Length
            )
            {
                throw new InvalidOperationException
                (
                    $"Migration '{migration.MigrationName}' does not contain an entity name."
                );
            }


            var entityName =
                migrationName
                    .Substring
                    (
                        entityNameStart
                    )
                    .Trim();


            if
            (
                string.IsNullOrWhiteSpace(entityName)
            )
            {
                throw new InvalidOperationException
                (
                    $"Migration '{migration.MigrationName}' does not contain an entity name."
                );
            }


            //===================================================
            // Locate Entity Model Blocks
            //===================================================

            var entityMarker =
                "modelBuilder.Entity(";


            var searchPosition =
                0;


            var builder =
                new StringBuilder
                (
                    snapshot
                );


            var removed =
                false;


            while
            (
                true
            )
            {
                var position =
                    snapshot.IndexOf
                    (
                        entityMarker,

                        searchPosition,

                        StringComparison.Ordinal
                    );


                if
                (
                    position < 0
                )
                {
                    break;
                }


                //===============================================
                // Locate Entity Block End
                //===============================================

                var blockEnd =
                    FindEntityBlockEnd
                    (
                        snapshot,

                        position
                    );


                if
                (
                    blockEnd < 0
                )
                {
                    throw new InvalidOperationException
                    (
                        $"Unable to determine the end of an entity model block in AppDbContextModelSnapshot.cs for migration '{migration.MigrationName}'."
                    );
                }


                var blockLength =
                    blockEnd -
                    position;


                var entityBlock =
                    snapshot
                        .Substring
                        (
                            position,

                            blockLength
                        );


                //===============================================
                // Check Exact Entity Declaration
                //===============================================

                if
                (
                    EntityBlockBelongsToMigration
                    (
                        entityBlock,

                        entityName
                    )
                )
                {
                    builder.Remove
                    (
                        position,

                        blockLength
                    );


                    snapshot =
                        builder.ToString();


                    removed =
                        true;


                    searchPosition =
                        position;


                    continue;
                }


                searchPosition =
                    blockEnd;
            }


            //===================================================
            // Verify Entity Model Was Removed
            //===================================================

            if
            (
                !removed
            )
            {
                throw new InvalidOperationException
                (
                    $"No exact model definition for entity '{entityName}' was found in AppDbContextModelSnapshot.cs."
                );
            }


            //===================================================
            // Write Updated Snapshot
            //===================================================

            File.WriteAllText
            (
                snapshotFile,

                builder.ToString()
            );
        }



        //=======================================================
        // Determine Entity Block Ownership
        //=======================================================

        private static bool
            EntityBlockBelongsToMigration
        (
            string entityBlock,

            string entityName
        )
        {
            //===================================================
            // Validate Entity Block
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(entityBlock)
            )
            {
                return false;
            }


            //===================================================
            // Normalize Entity Name
            //===================================================

            var normalizedEntityName =
                entityName.Trim();


            //===================================================
            // Locate Entity Declaration
            //===================================================

            var entityMarker =
                "modelBuilder.Entity(";


            var markerPosition =
                entityBlock.IndexOf
                (
                    entityMarker,

                    StringComparison.Ordinal
                );


            if
            (
                markerPosition < 0
            )
            {
                return false;
            }


            //===================================================
            // Extract Entity Declaration
            //===================================================

            var entityDeclaration =
                entityBlock
                    .Substring
                    (
                        markerPosition
                    );


            //===================================================
            // Locate Opening Quote
            //===================================================

            var openingQuote =
                entityDeclaration.IndexOf
                (
                    '"'
                );


            if
            (
                openingQuote < 0
            )
            {
                return false;
            }


            //===================================================
            // Locate Closing Quote
            //===================================================

            var closingQuote =
                entityDeclaration.IndexOf
                (
                    '"',

                    openingQuote + 1
                );


            if
            (
                closingQuote <= openingQuote
            )
            {
                return false;
            }


            //===================================================
            // Read Declared Entity Type
            //===================================================

            var declaredEntityName =
                entityDeclaration
                    .Substring
                    (
                        openingQuote + 1,

                        closingQuote -
                        openingQuote -
                        1
                    )
                    .Trim();


            if
            (
                string.IsNullOrWhiteSpace(declaredEntityName)
            )
            {
                return false;
            }


            //===================================================
            // Compare Fully Qualified Entity Name
            //===================================================

            if
            (
                string.Equals
                (
                    declaredEntityName,

                    normalizedEntityName,

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return true;
            }


            //===================================================
            // Compare Simple Entity Name
            //
            // Snapshot may contain:
            //
            // AppCore.Domain.Entities.Company
            //
            // while migration contains:
            //
            // Company
            //===================================================

            var lastDotPosition =
                declaredEntityName.LastIndexOf
                (
                    '.'
                );


            var declaredSimpleName =
                lastDotPosition >= 0
                    ? declaredEntityName
                        .Substring
                        (
                            lastDotPosition + 1
                        )
                        .Trim()
                    : declaredEntityName;


            //===================================================
            // Exact Simple Name Comparison
            //===================================================

            return
                string.Equals
                (
                    declaredSimpleName,

                    normalizedEntityName,

                    StringComparison.OrdinalIgnoreCase
                );
        }



        //=======================================================
        // Find Entity Block End
        //=======================================================

        private static int
            FindEntityBlockEnd
        (
            string snapshot,

            int entityBlockStart
        )
        {
            //===================================================
            // Locate Opening Brace
            //===================================================

            var openingBrace =
                snapshot.IndexOf
                (
                    '{',

                    entityBlockStart
                );


            if
            (
                openingBrace < 0
            )
            {
                return -1;
            }


            //===================================================
            // Track Braces
            //===================================================

            var depth =
                0;


            for
            (
                var index = openingBrace;

                index < snapshot.Length;

                index++
            )
            {
                var character =
                    snapshot[index];


                if
                (
                    character == '{'
                )
                {
                    depth++;
                }
                else if
                (
                    character == '}'
                )
                {
                    depth--;


                    if
                    (
                        depth == 0
                    )
                    {
                        var end =
                            index + 1;


                        //=======================================
                        // Include Following Semicolon
                        //=======================================

                        if
                        (
                            end < snapshot.Length
                            &&
                            snapshot[end] == ';'
                        )
                        {
                            end++;
                        }


                        //=======================================
                        // Include Following Line Break
                        //=======================================

                        while
                        (
                            end < snapshot.Length
                            &&
                            (
                                snapshot[end] == '\r'
                                ||
                                snapshot[end] == '\n'
                            )
                        )
                        {
                            end++;
                        }


                        return end;
                    }
                }
            }


            //===================================================
            // Invalid Entity Block
            //===================================================

            return -1;
        }
    }
}