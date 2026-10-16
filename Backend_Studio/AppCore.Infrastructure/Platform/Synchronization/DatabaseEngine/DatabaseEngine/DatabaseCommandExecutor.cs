//===============================================================
// Namespaces
//===============================================================

using System;
using System.Linq;
using System.Threading.Tasks;

using Npgsql;


//===============================================================
// Database Command Executor
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine;


//===============================================================
// Database Command Executor
//===============================================================

public class DatabaseCommandExecutor
{
    //===========================================================
    // Dependencies
    //===========================================================

    private readonly DatabaseConnectionResolver
        _connectionResolver;


    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseCommandExecutor
    (
        DatabaseConnectionResolver connectionResolver
    )
    {
        _connectionResolver =
            connectionResolver;
    }


    //===========================================================
    // Execute
    //===========================================================

    public async Task ExecuteAsync
    (
        string fileName,

        string arguments,

        string workingDirectory
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                fileName
            )
        )
        {
            throw new ArgumentException(
                "Command file name is required.",
                nameof(fileName)
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                workingDirectory
            )
        )
        {
            throw new ArgumentException(
                "Working directory is required.",
                nameof(workingDirectory)
            );
        }


        //=======================================================
        // SQL Execution
        //=======================================================

        if
        (
            string.Equals(
                fileName,
                "psql",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var sql =
                ExtractSqlFromArguments(
                    arguments
                );


            await ExecuteSqlAsync(
                sql
            );


            return;
        }


        //=======================================================
        // Execute External Command
        //=======================================================

        var startInfo =
            new System.Diagnostics.ProcessStartInfo
            {
                FileName =
                    fileName,

                Arguments =
                    arguments,

                WorkingDirectory =
                    workingDirectory,

                RedirectStandardOutput =
                    true,

                RedirectStandardError =
                    true,

                UseShellExecute =
                    false,

                CreateNoWindow =
                    true
            };


        using var process =
            new System.Diagnostics.Process
            {
                StartInfo =
                    startInfo
            };


        if
        (
            !process.Start()
        )
        {
            throw new InvalidOperationException(
                $"Unable to start command: {fileName}"
            );
        }


        var standardOutputTask =
            process.StandardOutput.ReadToEndAsync();


        var standardErrorTask =
            process.StandardError.ReadToEndAsync();


        await process.WaitForExitAsync();


        var standardOutput =
            await standardOutputTask;


        var standardError =
            await standardErrorTask;


        if
        (
            process.ExitCode != 0
        )
        {
            var errorMessage =
                string.Join
                (
                    Environment.NewLine,

                    new[]
                    {
                        standardOutput,

                        standardError
                    }
                )
                .Trim();


            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(
                    errorMessage
                )
                    ?
                    $"Command failed with exit code {process.ExitCode}: {fileName}"
                    :
                    errorMessage
            );
        }
    }


    //===========================================================
    // Execute SQL
    //===========================================================

    public async Task ExecuteSqlAsync
    (
        string sql
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                sql
            )
        )
        {
            throw new ArgumentException(
                "SQL command is required.",
                nameof(sql)
            );
        }


        await ExecuteSqlInTransactionAsync(
            sql
        );
    }


    //===========================================================
    // Execute SQL In Transaction
    //
    // All statements succeed together, or none are applied.
    //
    // Used for DROP + CREATE so a failed CREATE never leaves
    // the table dropped.
    //===========================================================

    public async Task ExecuteSqlInTransactionAsync
    (
        params string[] statements
    )
    {
        var sqlStatements =
            (statements ?? Array.Empty<string>())
                .Where
                (
                    statement =>
                        !string.IsNullOrWhiteSpace(
                            statement
                        )
                )
                .ToList();


        if
        (
            !sqlStatements.Any()
        )
        {
            throw new ArgumentException(
                "At least one SQL command is required.",
                nameof(statements)
            );
        }


        //=======================================================
        // Resolve Connection String
        //=======================================================

        var connectionString =
            await _connectionResolver
                .ResolveAsync();


        if
        (
            string.IsNullOrWhiteSpace(
                connectionString
            )
        )
        {
            throw new InvalidOperationException(
                "Unable to resolve the PostgreSQL connection string."
            );
        }


        //=======================================================
        // Open Connection & Transaction
        //=======================================================

        await using var connection =
            new NpgsqlConnection(
                connectionString
            );


        await connection.OpenAsync();


        await using var transaction =
            await connection.BeginTransactionAsync();


        try
        {
            foreach
            (
                var sql
                in sqlStatements
            )
            {
                await using var command =
                    connection.CreateCommand();


                command.Transaction =
                    transaction;


                command.CommandText =
                    sql;


                await command.ExecuteNonQueryAsync();
            }


            await transaction.CommitAsync();
        }
        catch
        (
            PostgresException exception
        )
        {
            await transaction.RollbackAsync();


            throw new InvalidOperationException(
                $"Database SQL execution failed: {exception.SqlState}: {exception.MessageText}",
                exception
            );
        }
        catch
        (
            Exception exception
        )
        {
            await transaction.RollbackAsync();


            throw new InvalidOperationException(
                $"Database SQL execution failed: {exception.Message}",
                exception
            );
        }
    }


    //===========================================================
    // Extract SQL From Arguments
    //
    // Looks for ' -c "' (with the opening quote) so a "-c"
    // inside the connection string is never mistaken for the
    // SQL command switch.
    //===========================================================

    private string ExtractSqlFromArguments
    (
        string arguments
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                arguments
            )
        )
        {
            throw new ArgumentException(
                "Database SQL arguments are required.",
                nameof(arguments)
            );
        }


        const string commandToken =
            " -c \"";


        var commandIndex =
            arguments.IndexOf(
                commandToken,
                StringComparison.OrdinalIgnoreCase
            );


        if
        (
            commandIndex < 0
        )
        {
            throw new InvalidOperationException(
                "Unable to resolve SQL command from database arguments."
            );
        }


        //=======================================================
        // Resolve SQL (inside the quotes)
        //=======================================================

        var sqlArguments =
            arguments[(commandIndex + commandToken.Length)..]
                .TrimEnd();


        if
        (
            sqlArguments.EndsWith(
                "\""
            )
        )
        {
            sqlArguments =
                sqlArguments[..^1];
        }


        //=======================================================
        // Restore Escaped Quotes
        //=======================================================

        sqlArguments =
            sqlArguments
                .Replace(
                    "\\\"",
                    "\""
                );


        if
        (
            string.IsNullOrWhiteSpace(
                sqlArguments
            )
        )
        {
            throw new InvalidOperationException(
                "Resolved database SQL command is empty."
            );
        }


        return
            sqlArguments;
    }
}