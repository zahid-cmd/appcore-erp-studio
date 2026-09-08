//===============================================================
// Namespaces
//===============================================================

using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.MigrationEngine;


//===============================================================
// Migration Command Executor
//===============================================================

public class MigrationCommandExecutor
{

    //===========================================================
    // Execute Command
    //===========================================================

    public async Task<MigrationCommandResult> ExecuteAsync
    (
        string fileName,
        string arguments,
        string workingDirectory,
        CancellationToken cancellationToken = default
    )
    {
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

        var startInfo =
            new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments ?? string.Empty,
                WorkingDirectory = workingDirectory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

        using var process =
            new Process
            {
                StartInfo = startInfo
            };

        process.Start();

        var standardOutputTask =
            process.StandardOutput.ReadToEndAsync();

        var standardErrorTask =
            process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync
        (
            cancellationToken
        );

        var standardOutput =
            await standardOutputTask;

        var standardError =
            await standardErrorTask;

        return new MigrationCommandResult
        (
            process.ExitCode,
            standardOutput,
            standardError
        );
    }
}


//===============================================================
// Migration Command Result
//===============================================================

public sealed class MigrationCommandResult
{
    //===========================================================
    // Constructor
    //===========================================================

    public MigrationCommandResult
    (
        int exitCode,
        string standardOutput,
        string standardError
    )
    {
        ExitCode = exitCode;

        StandardOutput =
            standardOutput ?? string.Empty;

        StandardError =
            standardError ?? string.Empty;
    }


    //===========================================================
    // Exit Code
    //===========================================================

    public int ExitCode
    {
        get;
    }


    //===========================================================
    // Standard Output
    //===========================================================

    public string StandardOutput
    {
        get;
    }


    //===========================================================
    // Standard Error
    //===========================================================

    public string StandardError
    {
        get;
    }


    //===========================================================
    // Success
    //===========================================================

    public bool IsSuccess =>
        ExitCode == 0;
}