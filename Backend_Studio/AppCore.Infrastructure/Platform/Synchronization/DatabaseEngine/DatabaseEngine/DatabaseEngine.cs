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
                $"Unable to resolve database removal operation for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Resolve CREATE TABLE Definition
        //=======================================================

        const string createTablePrefix =
            "CREATE TABLE ";


        if
        (
            !operation.StartsWith
            (
                createTablePrefix,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database table definition for submenu synchronization {submenuId}."
            );
        }


        var tableStartIndex =
            createTablePrefix.Length;


        var tableEndIndex =
            operation.IndexOf
            (
                " (",
                tableStartIndex,
                StringComparison.Ordinal
            );


        if
        (
            tableEndIndex <= tableStartIndex
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database table name for submenu synchronization {submenuId}."
            );
        }


        var qualifiedTableName =
            operation
                .Substring
                (
                    tableStartIndex,

                    tableEndIndex -
                    tableStartIndex
                )
                .Trim();


        if
        (
            string.IsNullOrWhiteSpace(
                qualifiedTableName
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database table name for submenu synchronization {submenuId}."
            );
        }


        //=======================================================
        // Build DROP TABLE SQL
        //=======================================================

        var removalOperation =
            $"DROP TABLE IF EXISTS {qualifiedTableName} CASCADE;";


        //=======================================================
        // Execute Database SQL
        //=======================================================

        await _commandExecutor
            .ExecuteSqlAsync
            (
                removalOperation
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
}