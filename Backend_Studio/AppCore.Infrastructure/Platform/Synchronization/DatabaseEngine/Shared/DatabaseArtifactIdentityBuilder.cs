//===============================================================
// Namespaces
//===============================================================

using System.Text.RegularExpressions;

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared;


//===============================================================
// Database Artifact Identity Builder
//===============================================================

public class DatabaseArtifactIdentityBuilder
{

    //===========================================================
    // Build
    //===========================================================

    public DatabaseArtifactIdentity
        Build
        (
            DatabaseInitializationContext
                initializationContext
        )
    {

        //=======================================================
        // Validate Initialization Context
        //=======================================================

        ArgumentNullException.ThrowIfNull
        (
            initializationContext
        );


        //=======================================================
        // Validate Synchronization ID
        //=======================================================

        if
        (
            initializationContext.SynchronizationId <= 0
        )
        {
            throw new InvalidOperationException
            (
                "A valid Code Synchronization ID is required."
            );
        }


        //=======================================================
        // Validate Submenu Code
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext.SubmenuCode
            )
        )
        {
            throw new InvalidOperationException
            (
                "Submenu Code is required to build the database artifact identity."
            );
        }


        //=======================================================
        // Validate Entity Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext.EntityName
            )
        )
        {
            throw new InvalidOperationException
            (
                "Entity Name is required to build the database artifact identity."
            );
        }


        //=======================================================
        // Validate Table Name
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext.TableName
            )
        )
        {
            throw new InvalidOperationException
            (
                "Table Name is required to build the database artifact identity."
            );
        }


        //=======================================================
        // Build Migration Key
        //=======================================================

        var migrationKey =
            Regex.Replace
            (
                initializationContext.SubmenuCode,
                @"[^A-Za-z0-9]",
                string.Empty
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                migrationKey
            )
        )
        {
            throw new InvalidOperationException
            (
                "A valid Migration Key could not be generated from the Submenu Code."
            );
        }


        //=======================================================
        // Build Migration Name
        //=======================================================

        var migrationName =
            $"AutoSync_{initializationContext.SynchronizationId}_{migrationKey}";


        //=======================================================
        // Return Database Artifact Identity
        //=======================================================

        return new DatabaseArtifactIdentity
        {
            SynchronizationId =
                initializationContext.SynchronizationId,

            SubmenuCode =
                initializationContext.SubmenuCode,

            EntityName =
                initializationContext.EntityName,

            Schema =
                initializationContext.Schema,

            TableName =
                initializationContext.TableName,

            MigrationKey =
                migrationKey,

            MigrationName =
                migrationName
        };
    }

}