//===============================================================  
// Namespaces  
//===============================================================  
  
using System;  
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
            await ExecuteSqlAsync(  
                ExtractSqlFromArguments(  
                    arguments  
                )  
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
        // PostgreSQL Connection  
        //=======================================================  
  
        await using var connection =  
            new NpgsqlConnection(  
                connectionString  
            );  
  
  
        //=======================================================  
        // Open Connection  
        //=======================================================  
  
        await connection.OpenAsync();  
  
  
        //=======================================================  
        // Create Command  
        //=======================================================  
  
        await using var command =  
            connection.CreateCommand();  
  
  
        command.CommandText =  
            sql;  
  
  
        //=======================================================  
        // Execute SQL  
        //=======================================================  
  
        try  
        {  
            await command.ExecuteNonQueryAsync();  
        }  
        catch  
        (  
            Exception exception  
        )  
        {  
            throw new InvalidOperationException(  
                "Database SQL execution failed.",  
                exception  
            );  
        }  
    }  
  
  
    //===========================================================  
    // Extract SQL From Arguments  
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
            "-c";  
  
  
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
  
  
        var sqlStart =  
            commandIndex +  
            commandToken.Length;  
  
  
        var sqlArguments =  
            arguments[sqlStart..]  
                .Trim();  
  
  
        if  
        (  
            sqlArguments.Length >= 2  
            &&  
            (  
                sqlArguments[0] == '"'  
                &&  
                sqlArguments[^1] == '"'  
            )  
        )  
        {  
            sqlArguments =  
                sqlArguments[1..^1];  
        }  
  
  
        return  
            sqlArguments  
                .Replace(  
                    "\\\"",  
                    "\""  
                );  
    }  
}  