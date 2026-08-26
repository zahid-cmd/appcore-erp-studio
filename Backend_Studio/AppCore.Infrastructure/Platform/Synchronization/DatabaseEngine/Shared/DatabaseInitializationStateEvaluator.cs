//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared;


//===============================================================
// Database Initialization State Evaluator
//===============================================================

public class DatabaseInitializationStateEvaluator
{

    //===========================================================
    // Evaluate Initialization State
    //===========================================================

    public DatabaseInitializationState
        Evaluate
        (
            DatabaseInitializationContext
                initializationContext,

            DatabaseArtifactIdentity
                artifactIdentity,

            DatabaseMigrationInfo
                migrationInfo,

            bool
                canConnect,

            bool
                schemaExists,

            bool
                tableExists
        )
    {

        //=======================================================
        // Validate Initialization Context
        //=======================================================

        if
        (
            initializationContext.SynchronizationId <= 0
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Invalid Code Synchronization ID."
            };
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext.SubmenuCode
            )
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Submenu code is required for database initialization."
            };
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext.EntityName
            )
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Entity name is required for database initialization."
            };
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext.TableName
            )
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Table name is required for database initialization."
            };
        }


        //=======================================================
        // Validate Database Artifact Identity
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                artifactIdentity.MigrationKey
            )
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Database migration key could not be resolved."
            };
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                artifactIdentity.MigrationName
            )
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Database migration name could not be resolved."
            };
        }


        //=======================================================
        // Validate Migration Physical Artifacts
        //=======================================================

        if
        (
            migrationInfo.MigrationExists
            &&
            !migrationInfo.DesignerExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the physical migration file exists but the migration designer file does not exist."
            };
        }


        if
        (
            !migrationInfo.MigrationExists
            &&
            migrationInfo.DesignerExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the migration designer file exists but the physical migration file does not exist."
            };
        }


        //=======================================================
        // Validate Migration Registration
        //=======================================================

        if
        (
            migrationInfo.IsRegistered
            &&
            (
                !migrationInfo.MigrationExists
                ||
                !migrationInfo.DesignerExists
            )
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the migration is registered but its physical migration files are incomplete."
            };
        }


        if
        (
            migrationInfo.IsApplied
            &&
            !migrationInfo.IsRegistered
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the migration is applied but is not registered."
            };
        }


        //=======================================================
        // Validate Database Connection
        //=======================================================

        if
        (
            !canConnect
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Database connection could not be established."
            };
        }


        //=======================================================
        // Validate Schema State
        //=======================================================

        if
        (
            !schemaExists
            &&
            tableExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the table exists but its schema could not be resolved."
            };
        }


        //=======================================================
        // Evaluate Already Initialized State
        //=======================================================

        if
        (
            migrationInfo.MigrationExists
            &&
            migrationInfo.DesignerExists
            &&
            migrationInfo.IsRegistered
            &&
            migrationInfo.IsApplied
            &&
            schemaExists
            &&
            tableExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    true,

                Message =
                    "Database is already initialized."
            };
        }


        //=======================================================
        // Evaluate Migration Ready To Apply
        //=======================================================

        if
        (
            migrationInfo.MigrationExists
            &&
            migrationInfo.DesignerExists
            &&
            migrationInfo.IsRegistered
            &&
            !migrationInfo.IsApplied
            &&
            !tableExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    true,

                Message =
                    "Database migration exists and is ready to be applied."
            };
        }


        //=======================================================
        // Evaluate Ready For Migration Creation
        //=======================================================

        if
        (
            !migrationInfo.MigrationExists
            &&
            !migrationInfo.DesignerExists
            &&
            !migrationInfo.IsRegistered
            &&
            !migrationInfo.IsApplied
            &&
            !tableExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    true,

                Message =
                    "Database is ready for migration creation."
            };
        }


        //=======================================================
        // Detect Applied Migration Without Table
        //=======================================================

        if
        (
            migrationInfo.IsRegistered
            &&
            migrationInfo.IsApplied
            &&
            !tableExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the migration is applied but the database table does not exist."
            };
        }


        //=======================================================
        // Detect Table Without Registered Migration
        //=======================================================

        if
        (
            !migrationInfo.IsRegistered
            &&
            tableExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the database table exists but no matching migration is registered."
            };
        }


        //=======================================================
        // Detect Table Without Applied Migration
        //=======================================================

        if
        (
            migrationInfo.IsRegistered
            &&
            !migrationInfo.IsApplied
            &&
            tableExists
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: the database table exists but the matching migration is not applied."
            };
        }


        //=======================================================
        // Detect Unregistered Physical Migration
        //=======================================================

        if
        (
            migrationInfo.MigrationExists
            &&
            migrationInfo.DesignerExists
            &&
            !migrationInfo.IsRegistered
        )
        {
            return new DatabaseInitializationState
            {
                IsReady =
                    false,

                Message =
                    "Inconsistent database state: physical migration files exist but the migration is not registered in EF Core."
            };
        }


        //=======================================================
        // Unknown State
        //=======================================================

        return new DatabaseInitializationState
        {
            IsReady =
                false,

            Message =
                "Database initialization state could not be determined."
        };
    }

}