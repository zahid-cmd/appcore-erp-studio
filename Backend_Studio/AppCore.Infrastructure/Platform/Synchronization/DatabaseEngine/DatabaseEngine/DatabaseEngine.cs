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
//
// IMPORTANT:
// Create / Initialize DROP and re-CREATE the table, so all rows
// in that table are lost. Both SQL statements are resolved first
// and then executed in ONE transaction, so if the CREATE fails
// the DROP is rolled back and the existing table stays intact.
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
        await RecreateAsync(
            submenuId,
            "creation"
        );
    }


    //===========================================================
    // Initialize Database
    //===========================================================

    public async Task InitializeAsync
    (
        long submenuId
    )
    {
        await RecreateAsync(
            submenuId,
            "initialization"
        );
    }


    //===========================================================
    // Remove Database
    //===========================================================

    public async Task RemoveAsync
    (
        long submenuId
    )
    {
        //=======================================================
        // Validate Environment
        //=======================================================

        await ValidateEnvironmentAsync();


        //=======================================================
        // Resolve Removal SQL
        //=======================================================

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
        // Execute
        //=======================================================

        await _commandExecutor
            .ExecuteSqlInTransactionAsync
            (
                operation
            );
    }


    //===========================================================
    // Recreate (DROP + CREATE in one transaction)
    //===========================================================

    private async Task RecreateAsync
    (
        long submenuId,

        string operationName
    )
    {
        //=======================================================
        // Validate Environment
        //=======================================================

        await ValidateEnvironmentAsync();


        //=======================================================
        // Resolve BOTH SQL statements before executing anything
        //
        // If building the CREATE statement fails (for example an
        // unsupported property type), nothing has been dropped.
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
                $"Unable to resolve database {operationName} removal operation for submenu synchronization {submenuId}."
            );
        }


        var creationOperation =
            await _operationResolver
                .ResolveAsync
                (
                    submenuId
                );


        if
        (
            string.IsNullOrWhiteSpace(
                creationOperation
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database {operationName} creation operation for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Execute DROP + CREATE atomically
        //=======================================================

        await _commandExecutor
            .ExecuteSqlInTransactionAsync
            (
                removalOperation,

                creationOperation
            );
    }


    //===========================================================
    // Validate Environment
    //
    // Confirms the backend projects and connection string can
    // be resolved before any SQL is built or executed.
    //===========================================================

    private async Task ValidateEnvironmentAsync()
    {
        await _projectResolver
            .ResolveBackendStudioRootAsync();


        await _projectResolver
            .ResolveInfrastructureProjectAsync();


        await _projectResolver
            .ResolveApiProjectAsync();


        await _connectionResolver
            .ResolveAsync();
    }
}