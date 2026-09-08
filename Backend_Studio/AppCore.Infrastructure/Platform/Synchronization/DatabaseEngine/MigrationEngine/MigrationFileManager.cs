//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine;


//===============================================================
// Migration File Manager
//===============================================================

public class MigrationFileManager
{

    //===========================================================
    // Find Migration
    //===========================================================

    public MigrationFileInfo FindMigration
    (
        string migrationsDirectory,
        long submenuId
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(migrationsDirectory)
        )
        {
            throw new ArgumentException
            (
                "Migrations directory is required.",
                nameof(migrationsDirectory)
            );
        }

        if
        (
            submenuId <= 0
        )
        {
            throw new ArgumentException
            (
                "Submenu ID must be greater than zero.",
                nameof(submenuId)
            );
        }

        if
        (
            !Directory.Exists
            (
                migrationsDirectory
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Migrations directory could not be found: {migrationsDirectory}"
            );
        }

        var migrationIdentity =
            $"AutoSync_{submenuId}_";

        var migrationFiles =
            Directory
                .GetFiles
                (
                    migrationsDirectory,
                    $"*{migrationIdentity}*.cs",
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
                .Where
                (
                    file =>
                        Path.GetFileNameWithoutExtension
                        (
                            file
                        )
                        .Contains
                        (
                            migrationIdentity,
                            StringComparison.OrdinalIgnoreCase
                        )
                )
                .ToList();

        if
        (
            migrationFiles.Count == 0
        )
        {
            throw new FileNotFoundException
            (
                $"No migration was found for Submenu ID {submenuId}."
            );
        }

        if
        (
            migrationFiles.Count > 1
        )
        {
            throw new InvalidOperationException
            (
                $"Multiple migrations were found for Submenu ID {submenuId}."
            );
        }

        var migrationFile =
            migrationFiles.Single();

        var migrationFileName =
            Path.GetFileNameWithoutExtension
            (
                migrationFile
            );

        var designerFile =
            Path.Combine
            (
                migrationsDirectory,
                $"{migrationFileName}.Designer.cs"
            );

        if
        (
            !File.Exists
            (
                designerFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Designer file could not be found for migration '{migrationFileName}'."
            );
        }

        return new MigrationFileInfo
        (
            submenuId,
            migrationFileName,
            migrationFile,
            designerFile
        );
    }


    //===========================================================
    // Verify Migration Files
    //===========================================================

    public void VerifyMigrationFiles
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
            !File.Exists
            (
                migration.MigrationFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Migration file could not be found: {migration.MigrationFile}"
            );
        }

        if
        (
            !File.Exists
            (
                migration.DesignerFile
            )
        )
        {
            throw new FileNotFoundException
            (
                $"Migration Designer file could not be found: {migration.DesignerFile}"
            );
        }
    }


    //===========================================================
    // Remove Migration Files
    //===========================================================

    public void RemoveMigrationFiles
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

        VerifyMigrationFiles
        (
            migration
        );

        File.Delete
        (
            migration.MigrationFile
        );

        File.Delete
        (
            migration.DesignerFile
        );
    }


    //===========================================================
    // Verify Migration Files Removed
    //===========================================================

    public void VerifyMigrationFilesRemoved
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
            File.Exists
            (
                migration.MigrationFile
            )
        )
        {
            throw new IOException
            (
                $"Migration file still exists: {migration.MigrationFile}"
            );
        }

        if
        (
            File.Exists
            (
                migration.DesignerFile
            )
        )
        {
            throw new IOException
            (
                $"Migration Designer file still exists: {migration.DesignerFile}"
            );
        }
    }
}


//===============================================================
// Migration File Information
//===============================================================

public sealed class MigrationFileInfo
{
    //===========================================================
    // Constructor
    //===========================================================

    public MigrationFileInfo
    (
        long submenuId,
        string migrationName,
        string migrationFile,
        string designerFile
    )
    {
        SubmenuId = submenuId;

        MigrationName =
            migrationName;

        MigrationFile =
            migrationFile;

        DesignerFile =
            designerFile;
    }


    //===========================================================
    // Submenu ID
    //===========================================================

    public long SubmenuId
    {
        get;
    }


    //===========================================================
    // Migration Name
    //===========================================================

    public string MigrationName
    {
        get;
    }


    //===========================================================
    // Migration File
    //===========================================================

    public string MigrationFile
    {
        get;
    }


    //===========================================================
    // Designer File
    //===========================================================

    public string DesignerFile
    {
        get;
    }
}