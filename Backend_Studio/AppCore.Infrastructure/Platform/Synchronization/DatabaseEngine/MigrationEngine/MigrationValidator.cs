//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine;


//===============================================================
// Migration Validator
//===============================================================

public class MigrationValidator
{

    //===========================================================
    // Validate Synchronization ID
    //===========================================================

    public void ValidateSynchronizationId
    (
        long synchronizationId
    )
    {
        if
        (
            synchronizationId <= 0
        )
        {
            throw new ArgumentException
            (
                "Synchronization ID must be greater than zero.",
                nameof(synchronizationId)
            );
        }
    }



    //===========================================================
    // Validate Migration Project
    //===========================================================

    public void ValidateProject
    (
        MigrationProject project
    )
    {
        if
        (
            project == null
        )
        {
            throw new ArgumentNullException
            (
                nameof(project)
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                project.InfrastructureProject
            )
        )
        {
            throw new InvalidOperationException
            (
                "Infrastructure project path is required."
            );
        }


        if
        (
            !Directory.Exists
            (
                project.InfrastructureProject
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Infrastructure project could not be found: {project.InfrastructureProject}"
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                project.InfrastructureProjectFile
            )
        )
        {
            throw new InvalidOperationException
            (
                "Infrastructure project file path is required."
            );
        }


        if
        (
            !File.Exists
            (
                project.InfrastructureProjectFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Infrastructure project file could not be found: {project.InfrastructureProjectFile}"
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                project.ApiProject
            )
        )
        {
            throw new InvalidOperationException
            (
                "API project path is required."
            );
        }


        if
        (
            !Directory.Exists
            (
                project.ApiProject
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"API project could not be found: {project.ApiProject}"
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                project.ApiProjectFile
            )
        )
        {
            throw new InvalidOperationException
            (
                "API project file path is required."
            );
        }


        if
        (
            !File.Exists
            (
                project.ApiProjectFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"API project file could not be found: {project.ApiProjectFile}"
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                project.MigrationsPath
            )
        )
        {
            throw new InvalidOperationException
            (
                "Migrations directory path is required."
            );
        }


        if
        (
            !Directory.Exists
            (
                project.MigrationsPath
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Migrations directory could not be found: {project.MigrationsPath}"
            );
        }
    }



    //===========================================================
    // Validate Creation State
    //===========================================================

    public void ValidateCreationState
    (
        MigrationProject project,

        long synchronizationId
    )
    {
        ValidateSynchronizationId
        (
            synchronizationId
        );


        ValidateProject
        (
            project
        );
    }



    //===========================================================
    // Validate Removal State
    //===========================================================

    public void ValidateRemovalState
    (
        MigrationProject project,

        MigrationFileInfo migration,

        long synchronizationId
    )
    {
        ValidateSynchronizationId
        (
            synchronizationId
        );


        ValidateProject
        (
            project
        );


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


        if
        (
            migration.SubmenuId != synchronizationId
        )
        {
            throw new InvalidOperationException
            (
                $"Migration '{migration.MigrationName}' does not belong to Synchronization ID {synchronizationId}."
            );
        }


        ValidateMigrationIdentity
        (
            migration
        );
    }



    //===========================================================
    // Validate Migration Creation
    //===========================================================

    public void ValidateCreation
    (
        MigrationFileInfo migration,

        string snapshotFile
    )
    {
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


        ValidateMigrationIdentity
        (
            migration
        );


        ValidateFileExists
        (
            migration.MigrationFile,

            "Migration file"
        );


        ValidateFileExists
        (
            migration.DesignerFile,

            "Migration Designer file"
        );


        ValidateFileExists
        (
            snapshotFile,

            "AppDbContextModelSnapshot.cs"
        );
    }



    //===========================================================
    // Validate Migration Removal
    //===========================================================

    public void ValidateRemoval
    (
        MigrationFileInfo migration,

        string snapshotFile
    )
    {
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


        ValidateMigrationIdentity
        (
            migration
        );


        ValidateFileRemoved
        (
            migration.MigrationFile,

            "Migration file"
        );


        ValidateFileRemoved
        (
            migration.DesignerFile,

            "Migration Designer file"
        );


        ValidateFileExists
        (
            snapshotFile,

            "AppDbContextModelSnapshot.cs"
        );
    }



    //===========================================================
    // Validate Migration Identity
    //===========================================================

    public void ValidateMigrationIdentity
    (
        MigrationFileInfo migration
    )
    {
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


        if
        (
            string.IsNullOrWhiteSpace
            (
                migration.MigrationName
            )
        )
        {
            throw new InvalidOperationException
            (
                "Migration name is required."
            );
        }


        if
        (
            migration.SubmenuId <= 0
        )
        {
            throw new InvalidOperationException
            (
                "Migration Submenu ID must be greater than zero."
            );
        }


        var migrationName =
            migration.MigrationName.Trim();


        //=======================================================
        // Expected Synchronization Identity
        //
        // The migration name generated by EF Core normally has
        // a timestamp prefix.
        //
        // Example:
        //
        // 20260902213255_AutoSync_11_Submenu_11
        //
        // The actual synchronization identity is:
        //
        // AutoSync_11_
        //=======================================================

        var expectedIdentity =
            $"AutoSync_{migration.SubmenuId}_";


        //=======================================================
        // Locate Synchronization Identity
        //=======================================================

        var identityPosition =
            migrationName.IndexOf
            (
                expectedIdentity,

                StringComparison.OrdinalIgnoreCase
            );


        if
        (
            identityPosition < 0
        )
        {
            throw new InvalidOperationException
            (
                $"Migration '{migration.MigrationName}' does not belong to Synchronization ID {migration.SubmenuId}."
            );
        }


        //=======================================================
        // Validate Identity Boundary
        //
        // Prevent a value such as:
        //
        // AutoSync_11_
        //
        // from matching an unrelated value where the expected
        // identity is embedded inside another identifier.
        //=======================================================

        if
        (
            identityPosition > 0
            &&
            migrationName[identityPosition - 1] != '_'
        )
        {
            throw new InvalidOperationException
            (
                $"Migration '{migration.MigrationName}' does not belong to Synchronization ID {migration.SubmenuId}."
            );
        }


        //=======================================================
        // Validate Entity Portion
        //
        // There must be something after:
        //
        // AutoSync_{SynchronizationId}_
        //
        // Example:
        //
        // AutoSync_5_AccountClass
        //
        // AutoSync_11_Submenu_11
        //=======================================================

        var entityStart =
            identityPosition +
            expectedIdentity.Length;


        if
        (
            entityStart >= migrationName.Length
        )
        {
            throw new InvalidOperationException
            (
                $"Migration '{migration.MigrationName}' does not contain a valid migration identity."
            );
        }


        var entityName =
            migrationName
                .Substring
                (
                    entityStart
                )
                .Trim();


        if
        (
            string.IsNullOrWhiteSpace(entityName)
        )
        {
            throw new InvalidOperationException
            (
                $"Migration '{migration.MigrationName}' does not contain a valid entity name."
            );
        }
    }



    //===========================================================
    // Validate File Exists
    //===========================================================

    private void ValidateFileExists
    (
        string filePath,

        string description
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
            throw new ArgumentException
            (
                $"{description} path is required.",

                nameof(filePath)
            );
        }


        if
        (
            !File.Exists
            (
                filePath
            )
        )
        {
            throw new FileNotFoundException
            (
                $"{description} could not be found: {filePath}"
            );
        }
    }



    //===========================================================
    // Validate File Removed
    //===========================================================

    private void ValidateFileRemoved
    (
        string filePath,

        string description
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
            throw new ArgumentException
            (
                $"{description} path is required.",

                nameof(filePath)
            );
        }


        if
        (
            File.Exists
            (
                filePath
            )
        )
        {
            throw new IOException
            (
                $"{description} still exists: {filePath}"
            );
        }
    }
}