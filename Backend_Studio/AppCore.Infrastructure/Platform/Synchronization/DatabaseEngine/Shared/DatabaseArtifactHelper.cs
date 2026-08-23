//===============================================================
// Namespaces
//===============================================================

using System.Text.RegularExpressions;

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared.Models;


//===============================================================
// Database Artifact Helper
//===============================================================

public class DatabaseArtifactHelper
{

    //===========================================================
    // Build Artifact Information
    //===========================================================

    public DatabaseArtifactInfo
        BuildArtifactInfo
    (
        string submenuCode,

        string schema,

        string tableName
    )
    {
        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Validate Schema
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                schema
            )
        )
        {
            throw new ArgumentException(
                "Database schema is required.",

                nameof(
                    schema
                )
            );
        }


        //=======================================================
        // Validate Table Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                tableName
            )
        )
        {
            throw new ArgumentException(
                "Database table name is required.",

                nameof(
                    tableName
                )
            );
        }


        //=======================================================
        // Normalize Values
        //=======================================================

        submenuCode =
            submenuCode.Trim();


        schema =
            schema.Trim();


        tableName =
            tableName.Trim();


        //=======================================================
        // Normalize Migration Key
        //=======================================================

        var normalizedMigrationKey =
            NormalizeMigrationKey
            (
                submenuCode
            );


        //=======================================================
        // Build Migration Name
        //=======================================================

        var migrationName =
            BuildMigrationName
            (
                normalizedMigrationKey
            );


        //=======================================================
        // Build Artifact Information
        //=======================================================

        return new DatabaseArtifactInfo
        {
            SubmenuCode =
                submenuCode,

            NormalizedMigrationKey =
                normalizedMigrationKey,

            Migration =
                new DatabaseMigrationInfo
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
                },

            SnapshotFilePath =
                string.Empty,

            SnapshotSectionExists =
                false,

            Table =
                new DatabaseTableInfo
                {
                    Schema =
                        schema,

                    TableName =
                        tableName,

                    TableExists =
                        false
                }
        };
    }



    //===========================================================
    // Normalize Migration Key
    //===========================================================

    public string
        NormalizeMigrationKey
    (
        string submenuCode
    )
    {
        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                submenuCode
            )
        )
        {
            throw new ArgumentException(
                "Submenu Code is required.",

                nameof(
                    submenuCode
                )
            );
        }


        //=======================================================
        // Normalize Submenu Code
        //=======================================================

        submenuCode =
            submenuCode.Trim();


        //=======================================================
        // Normalize Key
        //=======================================================

        var normalizedMigrationKey =
            Regex.Replace
            (
                submenuCode.ToUpperInvariant(),

                "[^A-Z0-9]",

                string.Empty
            );


        //=======================================================
        // Validate Normalized Key
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                normalizedMigrationKey
            )
        )
        {
            throw new InvalidOperationException(
                $"Submenu Code '{submenuCode}' could not be converted into a valid migration ownership key."
            );
        }


        return
            normalizedMigrationKey;
    }



    //===========================================================
    // Build Migration Name
    //===========================================================

    public string
        BuildMigrationName
    (
        string normalizedMigrationKey
    )
    {
        //=======================================================
        // Validate Migration Key
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                normalizedMigrationKey
            )
        )
        {
            throw new ArgumentException(
                "Normalized Migration Key is required.",

                nameof(
                    normalizedMigrationKey
                )
            );
        }


        //=======================================================
        // Normalize Migration Key
        //=======================================================

        normalizedMigrationKey =
            normalizedMigrationKey.Trim();


        //=======================================================
        // Build Migration Name
        //=======================================================

        return
            $"AutoSync_{normalizedMigrationKey}";
    }

}