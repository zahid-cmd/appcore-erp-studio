//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared.Models;


//===============================================================
// Database Migration Helper
//===============================================================

public class DatabaseMigrationHelper
{

    //===========================================================
    // Find Migration Information
    //===========================================================

    public DatabaseMigrationInfo
        FindMigrationInfo
    (
        string migrationsPath,

        string migrationName
    )
    {
        //=======================================================
        // Validate Migrations Path
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                migrationsPath
            )
        )
        {
            throw new ArgumentException(
                "Migrations Path is required.",

                nameof(
                    migrationsPath
                )
            );
        }


        //=======================================================
        // Validate Migration Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                migrationName
            )
        )
        {
            throw new ArgumentException(
                "Migration Name is required.",

                nameof(
                    migrationName
                )
            );
        }


        //=======================================================
        // Normalize Values
        //=======================================================

        migrationsPath =
            migrationsPath.Trim();


        migrationName =
            migrationName.Trim();


        //=======================================================
        // Validate Migrations Directory
        //=======================================================

        if
        (
            !Directory.Exists(
                migrationsPath
            )
        )
        {
            throw new DirectoryNotFoundException(
                $"Migrations directory '{migrationsPath}' could not be located."
            );
        }


        //=======================================================
        // Find Migration File
        //=======================================================

        var migrationFilePattern =
            $"*_{migrationName}.cs";


        var migrationFiles =
            Directory.GetFiles
            (
                migrationsPath,

                migrationFilePattern,

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


        //=======================================================
        // Validate Duplicate Migration Ownership
        //=======================================================

        if
        (
            migrationFiles.Length > 1
        )
        {
            throw new InvalidOperationException(
                $"Multiple initialization migrations were found for migration ownership '{migrationName}'."
            );
        }


        //=======================================================
        // Migration Does Not Exist
        //=======================================================

        if
        (
            migrationFiles.Length == 0
        )
        {
            return new DatabaseMigrationInfo
            {
                MigrationName =
                    migrationName,

                MigrationId =
                    string.Empty,

                MigrationFilePath =
                    string.Empty,

                DesignerFilePath =
                    string.Empty,

                MigrationExists =
                    false,

                DesignerExists =
                    false
            };
        }


        //=======================================================
        // Migration File Path
        //=======================================================

        var migrationFilePath =
            migrationFiles[0];


        //=======================================================
        // Migration Identifier
        //=======================================================

        var migrationId =
            Path.GetFileNameWithoutExtension
            (
                migrationFilePath
            );


        //=======================================================
        // Validate Migration Ownership
        //=======================================================

        if
        (
            !migrationId.EndsWith
            (
                $"_{migrationName}",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException(
                $"Migration file '{migrationFilePath}' does not match migration ownership '{migrationName}'."
            );
        }


        //=======================================================
        // Validate Migration Identifier
        //=======================================================

        if
        (
            string.Equals
            (
                migrationId,

                migrationName,

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException(
                $"Migration file '{migrationFilePath}' does not contain a valid EF Core migration identifier."
            );
        }


        //=======================================================
        // Designer File Path
        //=======================================================

        var designerFilePath =
            Path.Combine
            (
                migrationsPath,

                $"{migrationId}.Designer.cs"
            );


        //=======================================================
        // Designer Exists
        //=======================================================

        var designerExists =
            File.Exists(
                designerFilePath
            );


        //=======================================================
        // Return Migration Information
        //=======================================================

        return new DatabaseMigrationInfo
        {
            MigrationName =
                migrationName,

            MigrationId =
                migrationId,

            MigrationFilePath =
                migrationFilePath,

            DesignerFilePath =
                designerFilePath,

            MigrationExists =
                true,

            DesignerExists =
                designerExists
        };
    }



    //===========================================================
    // Migration Exists
    //===========================================================

    public bool
        MigrationExists
    (
        DatabaseMigrationInfo migrationInfo
    )
    {
        //=======================================================
        // Validate Migration Information
        //=======================================================

        if
        (
            migrationInfo is null
        )
        {
            throw new ArgumentNullException(
                nameof(
                    migrationInfo
                )
            );
        }


        //=======================================================
        // Migration Does Not Exist
        //=======================================================

        if
        (
            !migrationInfo.MigrationExists
        )
        {
            return false;
        }


        //=======================================================
        // Migration Path Missing
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                migrationInfo.MigrationFilePath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Check Migration File
        //=======================================================

        return File.Exists(
            migrationInfo.MigrationFilePath
        );
    }



    //===========================================================
    // Check Designer File
    //===========================================================

    public bool
        DesignerFileExists
    (
        DatabaseMigrationInfo migrationInfo
    )
    {
        //=======================================================
        // Validate Migration Information
        //=======================================================

        if
        (
            migrationInfo is null
        )
        {
            throw new ArgumentNullException(
                nameof(
                    migrationInfo
                )
            );
        }


        //=======================================================
        // Migration Does Not Exist
        //=======================================================

        if
        (
            !migrationInfo.MigrationExists
        )
        {
            return false;
        }


        //=======================================================
        // Designer Path Missing
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                migrationInfo.DesignerFilePath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Check Designer File
        //=======================================================

        return File.Exists(
            migrationInfo.DesignerFilePath
        );
    }



    //===========================================================
    // Complete Migration Artifacts Exist
    //===========================================================

    public bool
        CompleteMigrationArtifactsExist
    (
        DatabaseMigrationInfo migrationInfo
    )
    {
        //=======================================================
        // Validate Migration Information
        //=======================================================

        if
        (
            migrationInfo is null
        )
        {
            throw new ArgumentNullException(
                nameof(
                    migrationInfo
                )
            );
        }


        //=======================================================
        // Check Migration File
        //=======================================================

        var migrationExists =
            MigrationExists
            (
                migrationInfo
            );


        if
        (
            !migrationExists
        )
        {
            return false;
        }


        //=======================================================
        // Check Designer File
        //=======================================================

        return
            DesignerFileExists
            (
                migrationInfo
            );
    }

}