//===============================================================
// Namespaces
//===============================================================

using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

using Npgsql;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine
{

    //===========================================================
    // Database Command Executor
    //===========================================================

    public sealed class DatabaseCommandExecutor
    {

        //=======================================================
        // Execute
        //=======================================================

        public async Task
            ExecuteAsync
        (
            string fileName,

            string arguments,

            string workingDirectory,

            CancellationToken cancellationToken
        )
        {
            await ExecuteAndReturnOutputAsync
            (
                fileName,

                arguments,

                workingDirectory,

                cancellationToken
            );
        }



        //=======================================================
        // Execute And Return Output
        //=======================================================

        public async Task<string>
            ExecuteAndReturnOutputAsync
        (
            string fileName,

            string arguments,

            string workingDirectory,

            CancellationToken cancellationToken
        )
        {
            //===================================================
            // Validate File Name
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(fileName)
            )
            {
                throw new ArgumentException
                (
                    "Command file name is required.",
                    nameof(fileName)
                );
            }


            //===================================================
            // Validate Working Directory
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(workingDirectory)
            )
            {
                throw new ArgumentException
                (
                    "Working directory is required.",
                    nameof(workingDirectory)
                );
            }


            if
            (
                !System.IO.Directory.Exists
                (
                    workingDirectory
                )
            )
            {
                throw new InvalidOperationException
                (
                    $"Working directory does not exist: {workingDirectory}"
                );
            }


            //===================================================
            // Normalize Command Arguments
            //===================================================

            var normalizedArguments =
                string.IsNullOrWhiteSpace(arguments)
                    ? string.Empty
                    : NormalizeCommandArguments
                    (
                        arguments
                    );


            //===================================================
            // Process Information
            //===================================================

            var processStartInfo =
                new ProcessStartInfo
                {
                    FileName =
                        fileName,

                    Arguments =
                        normalizedArguments,

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


            //===================================================
            // Start Process
            //===================================================

            using var process =
                new Process
                {
                    StartInfo =
                        processStartInfo
                };


            try
            {
                if
                (
                    !process.Start()
                )
                {
                    throw new InvalidOperationException
                    (
                        $"Unable to start command: {fileName}"
                    );
                }
            }
            catch
            {
                throw new InvalidOperationException
                (
                    $"Unable to start command '{fileName}' " +
                    $"with working directory '{workingDirectory}'."
                );
            }


            //===================================================
            // Read Output
            //===================================================

            var standardOutputTask =
                process.StandardOutput
                    .ReadToEndAsync
                    (
                        cancellationToken
                    );


            var standardErrorTask =
                process.StandardError
                    .ReadToEndAsync
                    (
                        cancellationToken
                    );


            //===================================================
            // Wait For Process
            //===================================================

            await process.WaitForExitAsync
            (
                cancellationToken
            );


            //===================================================
            // Read Standard Output
            //===================================================

            var standardOutput =
                await standardOutputTask;


            //===================================================
            // Read Standard Error
            //===================================================

            var standardError =
                await standardErrorTask;


            //===================================================
            // Validate Exit Code
            //===================================================

            if
            (
                process.ExitCode != 0
            )
            {
                var output =
                    string.IsNullOrWhiteSpace(standardOutput)
                        ? "(no standard output)"
                        : standardOutput.Trim();


                var error =
                    string.IsNullOrWhiteSpace(standardError)
                        ? "(no standard error)"
                        : standardError.Trim();


                throw new InvalidOperationException
                (
                    $"Database command failed." +
                    Environment.NewLine +
                    $"Command: {fileName}" +
                    Environment.NewLine +
                    $"Arguments: {normalizedArguments}" +
                    Environment.NewLine +
                    $"Working Directory: {workingDirectory}" +
                    Environment.NewLine +
                    $"Exit Code: {process.ExitCode}" +
                    Environment.NewLine +
                    $"Output: {output}" +
                    Environment.NewLine +
                    $"Error: {error}"
                );
            }


            //===================================================
            // Return Output
            //===================================================

            return standardOutput;
        }



        //=======================================================
        // Execute SQL
        //=======================================================

        public async Task
            ExecuteSqlAsync
        (
            string connectionString,

            string sql,

            CancellationToken cancellationToken
        )
        {
            //===================================================
            // Validate Connection String
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(connectionString)
            )
            {
                throw new ArgumentException
                (
                    "Database connection string is required.",
                    nameof(connectionString)
                );
            }


            //===================================================
            // Validate SQL
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(sql)
            )
            {
                throw new ArgumentException
                (
                    "SQL command is required.",
                    nameof(sql)
                );
            }


            //===================================================
            // Open Database Connection
            //===================================================

            await using var connection =
                new NpgsqlConnection
                (
                    connectionString
                );


            await connection.OpenAsync
            (
                cancellationToken
            );


            //===================================================
            // Create SQL Command
            //===================================================

            await using var command =
                new NpgsqlCommand
                (
                    sql,

                    connection
                );


            //===================================================
            // Execute SQL Command
            //===================================================

            try
            {
                await command.ExecuteNonQueryAsync
                (
                    cancellationToken
                );
            }
            catch
            (
                PostgresException exception
            )
            {
                //================================================
                // Ignore Missing Database Object During Removal
                //================================================

                if
                (
                    exception.SqlState == "42P01"
                    &&
                    IsRemovalSql
                    (
                        sql
                    )
                )
                {
                    return;
                }


                //================================================
                // Re-throw Other Database Errors
                //================================================

                throw;
            }
        }



        //=======================================================
        // Execute SQL And Return Scalar
        //=======================================================

        public async Task<string?>
            ExecuteScalarAsync
        (
            string connectionString,

            string sql,

            CancellationToken cancellationToken
        )
        {
            //===================================================
            // Validate Connection String
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(connectionString)
            )
            {
                throw new ArgumentException
                (
                    "Database connection string is required.",
                    nameof(connectionString)
                );
            }


            //===================================================
            // Validate SQL
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace(sql)
            )
            {
                throw new ArgumentException
                (
                    "SQL command is required.",
                    nameof(sql)
                );
            }


            //===================================================
            // Open Database Connection
            //===================================================

            await using var connection =
                new NpgsqlConnection
                (
                    connectionString
                );


            await connection.OpenAsync
            (
                cancellationToken
            );


            //===================================================
            // Create SQL Command
            //===================================================

            await using var command =
                new NpgsqlCommand
                (
                    sql,

                    connection
                );


            //===================================================
            // Execute Scalar Command
            //===================================================

            var result =
                await command.ExecuteScalarAsync
                (
                    cancellationToken
                );


            //===================================================
            // No Result
            //===================================================

            if
            (
                result == null
                ||
                result == DBNull.Value
            )
            {
                return null;
            }


            //===================================================
            // Return Scalar Value
            //===================================================

            return
                Convert.ToString
                (
                    result
                );
        }



        //=======================================================
        // Normalize Command Arguments
        //=======================================================

        private static string
            NormalizeCommandArguments
        (
            string arguments
        )
        {
            //===================================================
            // Remove Escaping Added By Command Builder
            //===================================================

            return arguments
                .Replace
                (
                    "\\\"",

                    "\""
                )
                .Replace
                (
                    "\\\\",

                    "\\"
                );
        }



        //=======================================================
        // Determine Removal SQL
        //=======================================================

        private static bool
            IsRemovalSql
        (
            string sql
        )
        {
            //===================================================
            // Normalize SQL
            //===================================================

            var normalizedSql =
                sql.Trim();


            //===================================================
            // Drop Table
            //===================================================

            if
            (
                normalizedSql
                    .Contains
                    (
                        "DROP TABLE",

                        StringComparison.OrdinalIgnoreCase
                    )
            )
            {
                return true;
            }


            //===================================================
            // Drop Column
            //===================================================

            if
            (
                normalizedSql
                    .Contains
                    (
                        "DROP COLUMN",

                        StringComparison.OrdinalIgnoreCase
                    )
            )
            {
                return true;
            }


            //===================================================
            // Drop Index
            //===================================================

            if
            (
                normalizedSql
                    .Contains
                    (
                        "DROP INDEX",

                        StringComparison.OrdinalIgnoreCase
                    )
            )
            {
                return true;
            }


            //===================================================
            // Not Removal SQL
            //===================================================

            return false;
        }
    }
}