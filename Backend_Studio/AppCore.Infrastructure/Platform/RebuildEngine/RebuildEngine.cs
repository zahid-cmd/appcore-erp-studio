//===============================================================
// Namespaces
//===============================================================

using System.Diagnostics;

using AppCore.Application.Platform.RebuildEngine.DTOs;
using AppCore.Application.Platform.RebuildEngine.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.RebuildEngine;


//===============================================================
// Rebuild Engine
//===============================================================

public class RebuildEngine
    : IRebuildEngine
{

    //===========================================================
    // Configuration
    //===========================================================

    private const int FrontendPort =
        4100;

    private const string BackendProcessName =
        "AppCore.API.exe";



    //===========================================================
    // Rebuild Application
    //===========================================================

    public async Task<RebuildResultDto> RebuildAsync
    (
        string rebuildType
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(rebuildType)
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    "Rebuild type is required."
            };
        }


        var type =
            rebuildType.Trim();


        //=======================================================
        // Frontend
        //=======================================================

        if
        (
            type.Equals
            (
                "Frontend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return await RebuildFrontendAsync();
        }


        //=======================================================
        // Backend
        //=======================================================

        if
        (
            type.Equals
            (
                "Backend",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return await RebuildBackendAsync();
        }


        //=======================================================
        // All
        //=======================================================

        if
        (
            type.Equals
            (
                "All",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var frontendResult =
                await RebuildFrontendAsync();


            if
            (
                !frontendResult.Success
            )
            {
                return frontendResult;
            }


            var backendResult =
                await RebuildBackendAsync();


            if
            (
                !backendResult.Success
            )
            {
                return backendResult;
            }


            return new RebuildResultDto
            {
                Success =
                    true,

                Message =
                    "Frontend and Backend rebuild completed successfully."
            };
        }


        //=======================================================
        // Unsupported Type
        //=======================================================

        return new RebuildResultDto
        {
            Success =
                false,

            Message =
                $"Unsupported rebuild type: {rebuildType}."
        };
    }



    //===========================================================
    // Rebuild Frontend
    //===========================================================

    private async Task<RebuildResultDto>
        RebuildFrontendAsync()
    {
        var solutionRoot =
            FindSolutionRoot();


        if
        (
            solutionRoot == null
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    "Application solution root could not be located."
            };
        }


        //=======================================================
        // Frontend Root
        //=======================================================

        var frontendRoot =
            Path.Combine
            (
                solutionRoot,

                "Frontend_Studio"
            );


        if
        (
            !Directory.Exists(frontendRoot)
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    $"Frontend root directory was not found: {frontendRoot}"
            };
        }


        //=======================================================
        // Find Angular Project
        //=======================================================

        var angularProject =
            Directory
                .GetFiles
                (
                    frontendRoot,

                    "angular.json",

                    SearchOption.AllDirectories
                )
                .FirstOrDefault();


        if
        (
            angularProject == null
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    "Angular project could not be located."
            };
        }


        var frontendPath =
            Path.GetDirectoryName
            (
                angularProject
            );


        if
        (
            string.IsNullOrWhiteSpace(frontendPath)
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    "Angular project directory could not be determined."
            };
        }


        try
        {
            //===================================================
            // Verify package.json
            //===================================================

            var packageJsonPath =
                Path.Combine
                (
                    frontendPath,

                    "package.json"
                );


            if
            (
                !File.Exists(packageJsonPath)
            )
            {
                return new RebuildResultDto
                {
                    Success =
                        false,

                    Message =
                        $"Frontend package.json was not found: {packageJsonPath}"
                };
            }


            //===================================================
            // Stop Current Angular
            //===================================================

            await StopProcessUsingPortAsync
            (
                FrontendPort
            );


            //===================================================
            // Verify Port Is Free
            //===================================================

            var remainingProcessId =
                await GetProcessIdByPortAsync
                (
                    FrontendPort
                );


            if
            (
                remainingProcessId.HasValue
            )
            {
                return new RebuildResultDto
                {
                    Success =
                        false,

                    Message =
                        $"Frontend port {FrontendPort} could not be released."
                };
            }


            //===================================================
            // Find npm.cmd
            //===================================================

            var npmPath =
                FindNpmExecutable();


            if
            (
                string.IsNullOrWhiteSpace(npmPath)
            )
            {
                return new RebuildResultDto
                {
                    Success =
                        false,

                    Message =
                        "npm.cmd could not be located."
                };
            }


            //===================================================
            // Start Angular Through npm
            //
            // package.json:
            //
            // "start": "ng serve"
            //
            // Therefore this executes:
            //
            // npm run start -- --port 4100 --host localhost
            //
            // Angular performs its normal development build
            // automatically.
            //
            // IMPORTANT:
            //
            // - VS Code is NOT touched.
            // - VS Code is NOT closed.
            // - VS Code is NOT reopened.
            // - No visible CMD window is opened.
            // - No separate ng build is executed.
            //===================================================

            var angularProcess =
                StartAngularProcess
                (
                    npmPath,

                    frontendPath
                );


            if
            (
                angularProcess == null
            )
            {
                return new RebuildResultDto
                {
                    Success =
                        false,

                    Message =
                        "Angular process could not be started."
                };
            }


            //===================================================
            // Wait For Angular
            //===================================================

            var angularStarted =
                await WaitForAngularAsync
                (
                    angularProcess,

                    FrontendPort,

                    30000
                );


            if
            (
                !angularStarted
            )
            {
                var exitCode =
                    angularProcess.HasExited
                        ?
                        angularProcess.ExitCode
                        :
                        -1;


                try
                {
                    if
                    (
                        !angularProcess.HasExited
                    )
                    {
                        angularProcess.Kill
                        (
                            true
                        );
                    }
                }

                catch
                {
                }

                finally
                {
                    angularProcess.Dispose();
                }


                return new RebuildResultDto
                {
                    Success =
                        false,

                    Message =
                        $"Angular did not start successfully on port {FrontendPort}. Process exit code: {exitCode}."
                };
            }


            //===================================================
            // Angular Is Running
            //===================================================
            //
            // Do NOT dispose the process here.
            //
            // npm is keeping the Angular development server
            // alive in the background.
            //
            // VS Code remains completely untouched.
            //===================================================


            return new RebuildResultDto
            {
                Success =
                    true,

                Message =
                    $"Frontend rebuild completed successfully and Angular restarted on port {FrontendPort}."
            };
        }

        catch
        (
            Exception exception
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    $"Frontend rebuild failed: {exception.Message}"
            };
        }
    }



    //===========================================================
    // Find npm Executable
    //===========================================================

    private static string?
        FindNpmExecutable()
    {
        //=======================================================
        // Try Windows PATH
        //=======================================================

        try
        {
            using var process =
                new Process();


            process.StartInfo =
                new ProcessStartInfo
                {
                    FileName =
                        "where.exe",

                    Arguments =
                        "npm.cmd",

                    UseShellExecute =
                        false,

                    RedirectStandardOutput =
                        true,

                    RedirectStandardError =
                        true,

                    CreateNoWindow =
                        true
                };


            process.Start();


            var output =
                process
                    .StandardOutput
                    .ReadToEnd();


            process.WaitForExit();


            if
            (
                process.ExitCode == 0
                &&
                !string.IsNullOrWhiteSpace(output)
            )
            {
                var paths =
                    output
                        .Split
                        (
                            new[]
                            {
                                '\r',
                                '\n'
                            },

                            StringSplitOptions.RemoveEmptyEntries
                        );


                foreach
                (
                    var path in paths
                )
                {
                    var trimmedPath =
                        path.Trim();


                    if
                    (
                        trimmedPath.EndsWith
                        (
                            "npm.cmd",

                            StringComparison.OrdinalIgnoreCase
                        )
                        &&
                        File.Exists(trimmedPath)
                    )
                    {
                        return trimmedPath;
                    }
                }
            }
        }

        catch
        {
        }


        //=======================================================
        // Windows Node.js Installation
        //=======================================================

        var programFiles =
            Environment.GetFolderPath
            (
                Environment.SpecialFolder.ProgramFiles
            );


        if
        (
            !string.IsNullOrWhiteSpace(programFiles)
        )
        {
            var npmPath =
                Path.Combine
                (
                    programFiles,

                    "nodejs",

                    "npm.cmd"
                );


            if
            (
                File.Exists(npmPath)
            )
            {
                return npmPath;
            }
        }


        //=======================================================
        // Program Files x86
        //=======================================================

        var programFilesX86 =
            Environment.GetFolderPath
            (
                Environment.SpecialFolder.ProgramFilesX86
            );


        if
        (
            !string.IsNullOrWhiteSpace(programFilesX86)
        )
        {
            var npmPath =
                Path.Combine
                (
                    programFilesX86,

                    "nodejs",

                    "npm.cmd"
                );


            if
            (
                File.Exists(npmPath)
            )
            {
                return npmPath;
            }
        }


        //=======================================================
        // User npm Installation
        //=======================================================

        var appData =
            Environment.GetFolderPath
            (
                Environment.SpecialFolder.ApplicationData
            );


        if
        (
            !string.IsNullOrWhiteSpace(appData)
        )
        {
            var npmPath =
                Path.Combine
                (
                    appData,

                    "npm",

                    "npm.cmd"
                );


            if
            (
                File.Exists(npmPath)
            )
            {
                return npmPath;
            }
        }


        return null;
    }



    //===========================================================
    // Start Angular Process
    //===========================================================

    private static Process?
        StartAngularProcess
    (
        string npmPath,

        string frontendPath
    )
    {
        var process =
            new Process();


        process.StartInfo =
            new ProcessStartInfo
            {
                //================================================
                // npm.cmd must be executed through cmd.exe on
                // Windows.
                //
                // The CMD process is completely hidden.
                //
                // No CMD window is opened for the user.
                //================================================

                FileName =
                    "cmd.exe",

                Arguments =
                    $"/c \"\"{npmPath}\" run start -- --port {FrontendPort} --host localhost\"",

                WorkingDirectory =
                    frontendPath,

                UseShellExecute =
                    false,

                CreateNoWindow =
                    true,

                WindowStyle =
                    ProcessWindowStyle.Hidden,

                RedirectStandardOutput =
                    true,

                RedirectStandardError =
                    true
            };


        try
        {
            if
            (
                !process.Start()
            )
            {
                process.Dispose();

                return null;
            }


            //===================================================
            // Consume npm / Angular Output
            //
            // Angular is a long-running process.
            //
            // The output must be consumed continuously so that
            // redirected buffers never block the process.
            //===================================================

            _ =
                Task.Run
                (
                    async () =>
                    {
                        try
                        {
                            await process
                                .StandardOutput
                                .ReadToEndAsync();
                        }

                        catch
                        {
                        }
                    }
                );


            _ =
                Task.Run
                (
                    async () =>
                    {
                        try
                        {
                            await process
                                .StandardError
                                .ReadToEndAsync();
                        }

                        catch
                        {
                        }
                    }
                );


            return process;
        }

        catch
        {
            process.Dispose();

            throw;
        }
    }



    //===========================================================
    // Wait For Angular
    //===========================================================

    private static async Task<bool>
        WaitForAngularAsync
    (
        Process angularProcess,

        int port,

        int timeoutMilliseconds
    )
    {
        var elapsed =
            0;


        const int interval =
            500;


        while
        (
            elapsed < timeoutMilliseconds
        )
        {
            //===================================================
            // Angular Process Failed
            //===================================================

            if
            (
                angularProcess.HasExited
            )
            {
                return false;
            }


            //===================================================
            // Angular Is Listening
            //===================================================

            var processId =
                await GetProcessIdByPortAsync
                (
                    port
                );


            if
            (
                processId.HasValue
            )
            {
                return true;
            }


            await Task.Delay
            (
                interval
            );


            elapsed +=
                interval;
        }


        return false;
    }



    //===========================================================
    // Rebuild Backend
    //===========================================================

    private async Task<RebuildResultDto>
        RebuildBackendAsync()
    {
        var solutionRoot =
            FindSolutionRoot();


        if
        (
            solutionRoot == null
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    "Application solution root could not be located."
            };
        }


        var backendRoot =
            Path.Combine
            (
                solutionRoot,

                "Backend_Studio"
            );


        if
        (
            !Directory.Exists(backendRoot)
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    $"Backend root directory was not found: {backendRoot}"
            };
        }


        //=======================================================
        // Find API Project
        //=======================================================

        var backendProject =
            Directory
                .GetFiles
                (
                    backendRoot,

                    "AppCore.Api.csproj",

                    SearchOption.AllDirectories
                )
                .FirstOrDefault();


        if
        (
            backendProject == null
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    "AppCore.Api.csproj could not be located."
            };
        }


        var backendPath =
            Path.GetDirectoryName
            (
                backendProject
            );


        if
        (
            string.IsNullOrWhiteSpace(backendPath)
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    "Backend project directory could not be determined."
            };
        }


        try
        {
            //===================================================
            // Stop Existing API
            //===================================================

            await StopProcessByNameAsync
            (
                BackendProcessName
            );


            //===================================================
            // Give Windows Time To Release DLL Handles
            //===================================================

            await Task.Delay
            (
                2000
            );


            //===================================================
            // Build Backend
            //===================================================

            var buildResult =
                await RunProcessAsync
                (
                    "dotnet",

                    $"build \"{backendProject}\"",

                    backendPath
                );


            if
            (
                buildResult.ExitCode != 0
            )
            {
                var message =
                    string.IsNullOrWhiteSpace
                    (
                        buildResult.StandardError
                    )
                        ?
                        buildResult.StandardOutput
                        :
                        buildResult.StandardError;


                return new RebuildResultDto
                {
                    Success =
                        false,

                    Message =
                        string.IsNullOrWhiteSpace(message)
                            ?
                            "Backend build failed."
                            :
                            message
                };
            }


            return new RebuildResultDto
            {
                Success =
                    true,

                Message =
                    "Backend build completed successfully."
            };
        }

        catch
        (
            Exception exception
        )
        {
            return new RebuildResultDto
            {
                Success =
                    false,

                Message =
                    $"Backend rebuild failed: {exception.Message}"
            };
        }
    }



    //===========================================================
    // Stop Process By Name
    //===========================================================

    private static async Task
        StopProcessByNameAsync
    (
        string processName
    )
    {
        var executableName =
            Path.GetFileNameWithoutExtension
            (
                processName
            );


        for
        (
            var attempt = 0;

            attempt < 20;

            attempt++
        )
        {
            var processes =
                Process
                    .GetProcessesByName
                    (
                        executableName
                    );


            if
            (
                processes.Length == 0
            )
            {
                return;
            }


            foreach
            (
                var process in processes
            )
            {
                try
                {
                    if
                    (
                        !process.HasExited
                    )
                    {
                        process.Kill
                        (
                            true
                        );
                    }
                }

                catch
                {
                }

                finally
                {
                    process.Dispose();
                }
            }


            await Task.Delay
            (
                500
            );
        }
    }



    //===========================================================
    // Stop Process Using Port
    //===========================================================

    private static async Task
        StopProcessUsingPortAsync
    (
        int port
    )
    {
        for
        (
            var attempt = 0;

            attempt < 20;

            attempt++
        )
        {
            var processId =
                await GetProcessIdByPortAsync
                (
                    port
                );


            if
            (
                !processId.HasValue
            )
            {
                return;
            }


            try
            {
                using var process =
                    Process.GetProcessById
                    (
                        processId.Value
                    );


                if
                (
                    !process.HasExited
                )
                {
                    process.Kill
                    (
                        true
                    );
                }
            }

            catch
            {
            }


            await Task.Delay
            (
                500
            );
        }
    }



    //===========================================================
    // Get Process ID By Port
    //===========================================================

    private static async Task<int?>
        GetProcessIdByPortAsync
    (
        int port
    )
    {
        var result =
            await RunProcessAsync
            (
                "netstat",

                "-ano -p tcp",

                Environment.CurrentDirectory
            );


        if
        (
            result.ExitCode != 0
        )
        {
            return null;
        }


        var lines =
            result.StandardOutput
                .Split
                (
                    new[]
                    {
                        '\r',
                        '\n'
                    },

                    StringSplitOptions.RemoveEmptyEntries
                );


        foreach
        (
            var line in lines
        )
        {
            var parts =
                line.Split
                (
                    ' ',

                    StringSplitOptions.RemoveEmptyEntries
                );


            if
            (
                parts.Length < 5
            )
            {
                continue;
            }


            var localAddress =
                parts[1];


            var state =
                parts[3];


            var processIdText =
                parts[4];


            if
            (
                !state.Equals
                (
                    "LISTENING",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }


            if
            (
                !localAddress.EndsWith
                (
                    $":{port}",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }


            if
            (
                int.TryParse
                (
                    processIdText,

                    out var processId
                )
            )
            {
                return processId;
            }
        }


        return null;
    }



    //===========================================================
    // Find Solution Root
    //===========================================================

    private static string?
        FindSolutionRoot()
    {
        var directory =
            new DirectoryInfo
            (
                AppContext.BaseDirectory
            );


        while
        (
            directory != null
        )
        {
            var backendDirectory =
                Path.Combine
                (
                    directory.FullName,

                    "Backend_Studio"
                );


            var frontendDirectory =
                Path.Combine
                (
                    directory.FullName,

                    "Frontend_Studio"
                );


            if
            (
                Directory.Exists(backendDirectory)
                &&
                Directory.Exists(frontendDirectory)
            )
            {
                return directory.FullName;
            }


            directory =
                directory.Parent;
        }


        return null;
    }



    //===========================================================
    // Run Process
    //===========================================================

    private static async Task<ProcessResult>
        RunProcessAsync
    (
        string fileName,

        string arguments,

        string workingDirectory
    )
    {
        using var process =
            new Process();


        process.StartInfo =
            new ProcessStartInfo
            {
                FileName =
                    fileName,

                Arguments =
                    arguments,

                WorkingDirectory =
                    workingDirectory,

                UseShellExecute =
                    false,

                RedirectStandardOutput =
                    true,

                RedirectStandardError =
                    true,

                CreateNoWindow =
                    true,

                WindowStyle =
                    ProcessWindowStyle.Hidden
            };


        process.Start();


        var outputTask =
            process.StandardOutput
                .ReadToEndAsync();


        var errorTask =
            process.StandardError
                .ReadToEndAsync();


        await process.WaitForExitAsync();


        return new ProcessResult
        {
            ExitCode =
                process.ExitCode,

            StandardOutput =
                await outputTask,

            StandardError =
                await errorTask
        };
    }



    //===========================================================
    // Process Result
    //===========================================================

    private sealed class ProcessResult
    {

        public int ExitCode
        {
            get;
            init;
        }


        public string StandardOutput
        {
            get;
            init;
        } = string.Empty;


        public string StandardError
        {
            get;
            init;
        } = string.Empty;

    }

}