//===============================================================
// Namespaces
//===============================================================

using System;
using System.Threading.Tasks;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


//===============================================================
// Database Engine
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine;


//===============================================================
// Database Creation Engine
//===============================================================

public class DatabaseEngine : IDatabaseCreationEngine
{
    //===========================================================
    // Dependencies
    //===========================================================

    private readonly DatabaseProjectResolver
        _projectResolver;

    private readonly DatabaseConnectionResolver
        _connectionResolver;

    private readonly DatabaseCommandExecutor
        _commandExecutor;

    private readonly DatabaseOperationResolver
        _operationResolver;


    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseEngine
    (
        DatabaseProjectResolver projectResolver,

        DatabaseConnectionResolver connectionResolver,

        DatabaseCommandExecutor commandExecutor,

        DatabaseOperationResolver operationResolver
    )
    {
        _projectResolver =
            projectResolver;

        _connectionResolver =
            connectionResolver;

        _commandExecutor =
            commandExecutor;

        _operationResolver =
            operationResolver;
    }


    //===========================================================
    // Create Database
    //===========================================================

    public async Task CreateAsync
    (
        long submenuId
    )
    {
        var backendStudioRoot =
            await _projectResolver
                .ResolveBackendStudioRootAsync();


        var infrastructureProject =
            await _projectResolver
                .ResolveInfrastructureProjectAsync();


        var apiProject =
            await _projectResolver
                .ResolveApiProjectAsync();


        var connectionString =
            await _connectionResolver
                .ResolveAsync();


        //=======================================================
        // Resolve Database Removal Operation
        //=======================================================

        var removalOperation =
            await _operationResolver
                .ResolveRemovalAsync
                (
                    submenuId
                );


        if
        (
            string.IsNullOrWhiteSpace(
                removalOperation
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database initialization removal operation for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Remove Existing Database Table
        //=======================================================

        await _commandExecutor
            .ExecuteSqlAsync
            (
                removalOperation
            );


        //=======================================================
        // Resolve Database Creation Operation
        //=======================================================

        var operation =
            await _operationResolver
                .ResolveAsync
                (
                    submenuId
                );


        if
        (
            string.IsNullOrWhiteSpace(
                operation
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database creation operation for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Execute Database SQL
        //=======================================================

        await _commandExecutor
            .ExecuteAsync
            (
                "psql",

                $"-d \"{connectionString}\" -c \"{operation}\"",

                backendStudioRoot
            );


        _ =
            infrastructureProject;

        _ =
            apiProject;
    }


    //===========================================================
    // Remove Database
    //===========================================================

    public async Task RemoveAsync
    (
        long submenuId
    )
    {
        var backendStudioRoot =
            await _projectResolver
                .ResolveBackendStudioRootAsync();


        var infrastructureProject =
            await _projectResolver
                .ResolveInfrastructureProjectAsync();


        var apiProject =
            await _projectResolver
                .ResolveApiProjectAsync();


        var connectionString =
            await _connectionResolver
                .ResolveAsync();


        var operation =
            await _operationResolver
                .ResolveRemovalAsync
                (
                    submenuId
                );


        if
        (
            string.IsNullOrWhiteSpace(
                operation
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database removal operation for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Execute Database SQL
        //=======================================================

        await _commandExecutor
            .ExecuteSqlAsync
            (
                operation
            );


        _ =
            backendStudioRoot;

        _ =
            infrastructureProject;

        _ =
            apiProject;

        _ =
            connectionString;
    }


    //===========================================================
    // Initialize Database
    //===========================================================

    public async Task InitializeAsync
    (
        long submenuId
    )
    {
        var backendStudioRoot =
            await _projectResolver
                .ResolveBackendStudioRootAsync();


        var infrastructureProject =
            await _projectResolver
                .ResolveInfrastructureProjectAsync();


        var apiProject =
            await _projectResolver
                .ResolveApiProjectAsync();


        var connectionString =
            await _connectionResolver
                .ResolveAsync();


        //=======================================================
        // Resolve Database Removal Operation
        //=======================================================

        var removalOperation =
            await _operationResolver
                .ResolveRemovalAsync
                (
                    submenuId
                );


        if
        (
            string.IsNullOrWhiteSpace(
                removalOperation
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database initialization removal operation for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Drop Existing Database Table
        //=======================================================

        await _commandExecutor
            .ExecuteSqlAsync
            (
                removalOperation
            );


        //=======================================================
        // Resolve Database Creation Operation
        //=======================================================

        var operation =
            await _operationResolver
                .ResolveAsync
                (
                    submenuId
                );


        if
        (
            string.IsNullOrWhiteSpace(
                operation
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database initialization creation operation for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Execute Database SQL
        //=======================================================

        await _commandExecutor
            .ExecuteAsync
            (
                "psql",

                $"-d \"{connectionString}\" -c \"{operation}\"",

                backendStudioRoot
            );


        _ =
            infrastructureProject;

        _ =
            apiProject;
    }
}