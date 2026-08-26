//===============================================================
// Namespaces
//===============================================================

using System.Data;
using System.Data.Common;

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;

using AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.Shared;


//===============================================================
// Database Table Inspector
//===============================================================

public class DatabaseTableInspector
{

    //===========================================================
    // Database Context
    //===========================================================

    private readonly AppDbContext
        _dbContext;


    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseTableInspector
    (
        AppDbContext
            dbContext
    )
    {
        _dbContext =
            dbContext;
    }


    //===========================================================
    // Check Database Connection
    //===========================================================

    public async Task<bool>
        CanConnectAsync()
    {

        try
        {
            return
                await _dbContext.Database
                    .CanConnectAsync();
        }
        catch
        {
            return
                false;
        }
    }


    //===========================================================
    // Check Schema Exists
    //===========================================================

    public async Task<bool>
        SchemaExistsAsync
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
        // Default Schema
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                initializationContext.Schema
            )
        )
        {
            return
                true;
        }


        //=======================================================
        // Get Database Connection
        //=======================================================

        DbConnection
            connection =
                _dbContext.Database
                    .GetDbConnection();


        //=======================================================
        // Open Connection
        //=======================================================

        bool
            closeConnection =
                connection.State
                    !=
                ConnectionState.Open;


        if
        (
            closeConnection
        )
        {
            await connection
                .OpenAsync();
        }


        try
        {

            //===================================================
            // Create Command
            //===================================================

            await using DbCommand
                command =
                    connection
                        .CreateCommand();


            command.CommandText =
                """
                SELECT EXISTS
                (
                    SELECT 1
                    FROM information_schema.schemata
                    WHERE schema_name = @schema
                );
                """;


            //===================================================
            // Add Schema Parameter
            //===================================================

            DbParameter
                schemaParameter =
                    command
                        .CreateParameter();


            schemaParameter.ParameterName =
                "@schema";


            schemaParameter.Value =
                initializationContext.Schema;


            command.Parameters
                .Add
                (
                    schemaParameter
                );


            //===================================================
            // Execute
            //===================================================

            object?
                result =
                    await command
                        .ExecuteScalarAsync();


            return
                result is bool
                    schemaExists
                &&
                schemaExists;
        }
        finally
        {

            //===================================================
            // Close Connection
            //===================================================

            if
            (
                closeConnection
                &&
                connection.State
                    ==
                ConnectionState.Open
            )
            {
                await connection
                    .CloseAsync();
            }
        }
    }


    //===========================================================
    // Check Table Exists
    //===========================================================

    public async Task<bool>
        TableExistsAsync
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
                "Table name is required for database table inspection."
            );
        }


        //=======================================================
        // Get Database Connection
        //=======================================================

        DbConnection
            connection =
                _dbContext.Database
                    .GetDbConnection();


        //=======================================================
        // Open Connection
        //=======================================================

        bool
            closeConnection =
                connection.State
                    !=
                ConnectionState.Open;


        if
        (
            closeConnection
        )
        {
            await connection
                .OpenAsync();
        }


        try
        {

            //===================================================
            // Create Command
            //===================================================

            await using DbCommand
                command =
                    connection
                        .CreateCommand();


            //===================================================
            // Explicit Schema
            //===================================================

            if
            (
                !string.IsNullOrWhiteSpace
                (
                    initializationContext.Schema
                )
            )
            {
                command.CommandText =
                    """
                    SELECT EXISTS
                    (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = @schema
                        AND table_name = @tableName
                    );
                    """;


                DbParameter
                    schemaParameter =
                        command
                            .CreateParameter();


                schemaParameter.ParameterName =
                    "@schema";


                schemaParameter.Value =
                    initializationContext.Schema;


                command.Parameters
                    .Add
                    (
                        schemaParameter
                    );
            }


            //===================================================
            // Default Schema
            //===================================================

            else
            {
                command.CommandText =
                    """
                    SELECT EXISTS
                    (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = current_schema()
                        AND table_name = @tableName
                    );
                    """;
            }


            //===================================================
            // Add Table Parameter
            //===================================================

            DbParameter
                tableParameter =
                    command
                        .CreateParameter();


            tableParameter.ParameterName =
                "@tableName";


            tableParameter.Value =
                initializationContext.TableName;


            command.Parameters
                .Add
                (
                    tableParameter
                );


            //===================================================
            // Execute
            //===================================================

            object?
                result =
                    await command
                        .ExecuteScalarAsync();


            return
                result is bool
                    tableExists
                &&
                tableExists;
        }
        finally
        {

            //===================================================
            // Close Connection
            //===================================================

            if
            (
                closeConnection
                &&
                connection.State
                    ==
                ConnectionState.Open
            )
            {
                await connection
                    .CloseAsync();
            }
        }
    }

}