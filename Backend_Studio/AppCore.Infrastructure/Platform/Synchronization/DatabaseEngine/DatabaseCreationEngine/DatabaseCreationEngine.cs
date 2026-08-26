//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;
using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseCreationEngine;


//===============================================================
// Database Creation Engine
//===============================================================

public class DatabaseCreationEngine
    : IDatabaseCreationEngine
{

    //===========================================================
    // Database Initialization Context Resolver
    //===========================================================

    private readonly DatabaseInitializationContextResolver
        _databaseInitializationContextResolver;


    //===========================================================
    // Database Artifact Identity Builder
    //===========================================================

    private readonly DatabaseArtifactIdentityBuilder
        _databaseArtifactIdentityBuilder;


    //===========================================================
    // Database Migration Tracker
    //===========================================================

    private readonly DatabaseMigrationTracker
        _databaseMigrationTracker;


    //===========================================================
    // Database Table Inspector
    //===========================================================

    private readonly DatabaseTableInspector
        _databaseTableInspector;


    //===========================================================
    // Database Initialization State Evaluator
    //===========================================================

    private readonly DatabaseInitializationStateEvaluator
        _databaseInitializationStateEvaluator;


    //===========================================================
    // EF Core Migration Executor
    //===========================================================

    private readonly EfCoreMigrationExecutor
        _efCoreMigrationExecutor;


    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseCreationEngine
    (
        DatabaseInitializationContextResolver
            databaseInitializationContextResolver,

        DatabaseArtifactIdentityBuilder
            databaseArtifactIdentityBuilder,

        DatabaseMigrationTracker
            databaseMigrationTracker,

        DatabaseTableInspector
            databaseTableInspector,

        DatabaseInitializationStateEvaluator
            databaseInitializationStateEvaluator,

        EfCoreMigrationExecutor
            efCoreMigrationExecutor
    )
    {
        _databaseInitializationContextResolver =
            databaseInitializationContextResolver;


        _databaseArtifactIdentityBuilder =
            databaseArtifactIdentityBuilder;


        _databaseMigrationTracker =
            databaseMigrationTracker;


        _databaseTableInspector =
            databaseTableInspector;


        _databaseInitializationStateEvaluator =
            databaseInitializationStateEvaluator;


        _efCoreMigrationExecutor =
            efCoreMigrationExecutor;
    }


    //===========================================================
    // Resolve Initialization Context
    //===========================================================

    public async Task<DatabaseInitializationContext>
        ResolveInitializationContextAsync
        (
            long codeSynchronizationId
        )
    {
        return
            await _databaseInitializationContextResolver
                .ResolveAsync
                (
                    codeSynchronizationId
                );
    }


    //===========================================================
    // Create Database
    //===========================================================

    public async Task
        CreateAsync
        (
            long codeSynchronizationId
        )
    {

        //=======================================================
        // Resolve Database Initialization Context
        //=======================================================

        DatabaseInitializationContext
            initializationContext =
                await ResolveInitializationContextAsync
                (
                    codeSynchronizationId
                );


        //=======================================================
        // Build Database Artifact Identity
        //=======================================================

        DatabaseArtifactIdentity
            artifactIdentity =
                _databaseArtifactIdentityBuilder
                    .Build
                    (
                        initializationContext
                    );


        //=======================================================
        // Inspect Migration
        //=======================================================

        DatabaseMigrationInfo
            migrationInfo =
                await _databaseMigrationTracker
                    .TrackAsync
                    (
                        initializationContext,

                        artifactIdentity
                    );


        //=======================================================
        // Inspect Database Connection
        //=======================================================

        bool
            canConnect =
                await _databaseTableInspector
                    .CanConnectAsync();


        //=======================================================
        // Inspect Schema
        //=======================================================

        bool
            schemaExists =
                false;


        if
        (
            canConnect
        )
        {
            schemaExists =
                await _databaseTableInspector
                    .SchemaExistsAsync
                    (
                        initializationContext
                    );
        }


        //=======================================================
        // Inspect Table
        //=======================================================

        bool
            tableExists =
                false;


        if
        (
            canConnect
            &&
            schemaExists
        )
        {
            tableExists =
                await _databaseTableInspector
                    .TableExistsAsync
                    (
                        initializationContext
                    );
        }


        //=======================================================
        // Evaluate Database Initialization State
        //=======================================================

        DatabaseInitializationState
            initializationState =
                _databaseInitializationStateEvaluator
                    .Evaluate
                    (
                        initializationContext,

                        artifactIdentity,

                        migrationInfo,

                        canConnect,

                        schemaExists,

                        tableExists
                    );


        //=======================================================
        // Validate Database Initialization State
        //=======================================================

        if
        (
            !initializationState.IsReady
        )
        {
            throw new InvalidOperationException
            (
                initializationState.Message
            );
        }


        //=======================================================
        // Database Already Initialized
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
            canConnect
            &&
            schemaExists
            &&
            tableExists
        )
        {
            return;
        }


        //=======================================================
        // Segment 4
        // Create Physical EF Core Migration
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

            //===================================================
            // Create Migration
            //===================================================

            await _efCoreMigrationExecutor
                .CreateMigrationAsync
                (
                    initializationContext.BackendSolutionPath,

                    initializationContext
                        .BackendInfrastructureProjectPath,

                    initializationContext
                        .BackendStartupProjectPath,

                    artifactIdentity
                );


            //===================================================
            // Apply Newly Created Migration Immediately
            //===================================================

            await _efCoreMigrationExecutor
                .ApplyMigrationAsync
                (
                    initializationContext.BackendSolutionPath,

                    initializationContext
                        .BackendInfrastructureProjectPath,

                    initializationContext
                        .BackendStartupProjectPath
                );
        }


        //=======================================================
        // Apply Existing Pending Migration
        //=======================================================

        else if
        (
            migrationInfo.MigrationExists
            &&
            migrationInfo.DesignerExists
            &&
            migrationInfo.IsRegistered
            &&
            !migrationInfo.IsApplied
        )
        {

            //===================================================
            // Apply EF Core Migration
            //===================================================

            await _efCoreMigrationExecutor
                .ApplyMigrationAsync
                (
                    initializationContext.BackendSolutionPath,

                    initializationContext
                        .BackendInfrastructureProjectPath,

                    initializationContext
                        .BackendStartupProjectPath
                );
        }


        //=======================================================
        // Reinspect Migration
        //=======================================================

        migrationInfo =
            await _databaseMigrationTracker
                .TrackAsync
                (
                    initializationContext,

                    artifactIdentity
                );


        //=======================================================
        // Reinspect Database Connection
        //=======================================================

        canConnect =
            await _databaseTableInspector
                .CanConnectAsync();


        //=======================================================
        // Reinspect Schema
        //=======================================================

        schemaExists =
            false;


        if
        (
            canConnect
        )
        {
            schemaExists =
                await _databaseTableInspector
                    .SchemaExistsAsync
                    (
                        initializationContext
                    );
        }


        //=======================================================
        // Reinspect Table
        //=======================================================

        tableExists =
            false;


        if
        (
            canConnect
            &&
            schemaExists
        )
        {
            tableExists =
                await _databaseTableInspector
                    .TableExistsAsync
                    (
                        initializationContext
                    );
        }


        //=======================================================
        // Verify Database Initialization State
        //=======================================================

        initializationState =
            _databaseInitializationStateEvaluator
                .Evaluate
                (
                    initializationContext,

                    artifactIdentity,

                    migrationInfo,

                    canConnect,

                    schemaExists,

                    tableExists
                );


        //=======================================================
        // Validate Final Initialization State
        //=======================================================

        if
        (
            !initializationState.IsReady
        )
        {
            throw new InvalidOperationException
            (
                initializationState.Message
            );
        }


        //=======================================================
        // Verify Final Database Initialization
        //=======================================================

        if
        (
            !migrationInfo.MigrationExists
            ||
            !migrationInfo.DesignerExists
            ||
            !migrationInfo.IsRegistered
            ||
            !migrationInfo.IsApplied
            ||
            !canConnect
            ||
            !schemaExists
            ||
            !tableExists
        )
        {
            throw new InvalidOperationException
            (
                "Database initialization completed without reaching the required final database state."
            );
        }


        //=======================================================
        // Segment 4 Complete
        //=======================================================

    }

}