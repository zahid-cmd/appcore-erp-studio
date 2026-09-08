//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;

using AppCore.Infrastructure.Platform.ProjectBuilder.Models;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.ProjectBuilder.Shared;


//===============================================================
// Backend Project Build Executor
//===============================================================

public class BackendProjectBuildExecutor
{


    //===========================================================
    // Execute
    //===========================================================

    public async Task<BackendProjectBuildResult>
        ExecuteAsync
    (
        BackendProjectBuildContext context
    )
    {
        var startInfo =
            new ProcessStartInfo
            {
                FileName =
                    "dotnet",

                WorkingDirectory =
                    context.InfrastructureProjectPath,

                RedirectStandardOutput =
                    true,

                RedirectStandardError =
                    true,

                UseShellExecute =
                    false,

                CreateNoWindow =
                    true
            };


        startInfo.ArgumentList
            .Add
            (
                "build"
            );


        startInfo.ArgumentList
            .Add
            (
                context.InfrastructureProjectFile
            );


        using var process =
            new Process
            {
                StartInfo =
                    startInfo
            };


        process.Start();


        var standardOutputTask =
            process.StandardOutput
                .ReadToEndAsync();


        var standardErrorTask =
            process.StandardError
                .ReadToEndAsync();


        await process
            .WaitForExitAsync();


        var standardOutput =
            await standardOutputTask;


        var standardError =
            await standardErrorTask;


        var buildOutput =
            string.IsNullOrWhiteSpace
            (
                standardError
            )
                ? standardOutput
                : $"{standardOutput}{Environment.NewLine}{standardError}";


        if
        (
            process.ExitCode != 0
        )
        {
            return new BackendProjectBuildResult
            {
                Success =
                    false,

                Message =
                    "Backend Infrastructure project build failed.",

                BuildOutput =
                    buildOutput
            };
        }


        return new BackendProjectBuildResult
        {
            Success =
                true,

            Message =
                "Backend Infrastructure project build completed successfully.",

            BuildOutput =
                buildOutput
        };
    }

}