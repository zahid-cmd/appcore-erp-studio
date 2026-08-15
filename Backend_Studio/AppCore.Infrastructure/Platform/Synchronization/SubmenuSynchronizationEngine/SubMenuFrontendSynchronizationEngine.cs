//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using AppCore.Application.Platform.CommonInterfaces;
using AppCore.Application.Platform.SubmenuFrontendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;


//===============================================================
// Submenu Frontend Synchronization Engine
//===============================================================

public class SubmenuFrontendSynchronizationEngine
    : ISubmenuFrontendSynchronizationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly IFileRemover
        _fileRemover;



    //===========================================================
    // Constructor
    //===========================================================

    public SubmenuFrontendSynchronizationEngine
    (
        IFileRemover fileRemover
    )
    {
        _fileRemover =
            fileRemover;
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<SubmenuSynchronizationResultDto> SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        await PrepareFrontendTargetAsync
        (
            synchronization
        );


        return await CreateFrontendStructureAsync
        (
            synchronization
        );
    }



    //===========================================================
    // Prepare Frontend Target
    //===========================================================

    private async Task PrepareFrontendTargetAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization == null
        )
        {
            throw new ArgumentNullException
            (
                nameof(synchronization)
            );
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.FrontendSolution
            )
        )
        {
            throw new InvalidOperationException
            (
                "Frontend solution path is not configured."
            );
        }


        if
        (
            !Directory.Exists
            (
                synchronization.FrontendSolution
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Frontend solution was not found: {synchronization.FrontendSolution}"
            );
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Create Frontend Structure
    //===========================================================

    private async Task<SubmenuSynchronizationResultDto>
        CreateFrontendStructureAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        var totalOperations =
            0;


        var successfulOperations =
            0;


        var failedOperations =
            0;



        //=======================================================
        // Resolve Canonical Submenu Folder
        //=======================================================

        var submenuFolder =
            NormalizeSubmenuFolder
            (
                synchronization
            );


        var formFolder =
            Path.Combine
            (
                submenuFolder,

                "form"
            );


        var listFolder =
            Path.Combine
            (
                submenuFolder,

                "list"
            );



        //=======================================================
        // Create Submenu Folder
        //=======================================================

        await CreateFolderAsync
        (
            submenuFolder
        );



        //=======================================================
        // Create Form Folder
        //=======================================================

        await CreateFolderAsync
        (
            formFolder
        );



        //=======================================================
        // Create List Folder
        //=======================================================

        await CreateFolderAsync
        (
            listFolder
        );



        //=======================================================
        // Create Model File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendCoreFile
            (
                synchronization.FrontendSolution,

                synchronization.FrontendMenuFolder,

                synchronization.FrontendSubmenuModelFile,

                "models",

                ".model.ts"
            ),

            true,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create Service File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendCoreFile
            (
                synchronization.FrontendSolution,

                synchronization.FrontendMenuFolder,

                synchronization.FrontendSubmenuServiceFile,

                "services",

                ".service.ts"
            ),

            true,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create Submenu Route File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendCoreFile
            (
                synchronization.FrontendSolution,

                synchronization.FrontendMenuFolder,

                synchronization.FrontendSubmenuRouteFile,

                "routes",

                ".routes.ts"
            ),

            true,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create Form TypeScript File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendPageFile
            (
                formFolder,

                synchronization.FrontendSubmenuFormTsFile,

                ".ts"
            ),

            false,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create Form HTML File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendPageFile
            (
                formFolder,

                synchronization.FrontendSubmenuFormHtmlFile,

                ".html"
            ),

            false,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create Form CSS File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendPageFile
            (
                formFolder,

                synchronization.FrontendSubmenuFormCssFile,

                ".css"
            ),

            false,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create List TypeScript File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendPageFile
            (
                listFolder,

                synchronization.FrontendSubmenuListTsFile,

                ".ts"
            ),

            false,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create List HTML File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendPageFile
            (
                listFolder,

                synchronization.FrontendSubmenuListHtmlFile,

                ".html"
            ),

            false,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Create List CSS File
        //=======================================================

        await CreateEmptyFileAsync
        (
            NormalizeFrontendPageFile
            (
                listFolder,

                synchronization.FrontendSubmenuListCssFile,

                ".css"
            ),

            false,

            () =>
            {
                totalOperations++;

                successfulOperations++;
            },

            () =>
            {
                failedOperations++;
            }
        );



        //=======================================================
        // Result
        //=======================================================

        return new SubmenuSynchronizationResultDto
        {
            Success =
                failedOperations == 0,


            Message =
                failedOperations == 0
                    ? "Submenu frontend synchronization completed successfully."
                    : "Submenu frontend synchronization completed with errors.",


            SynchronizedDate =
                DateTime.UtcNow,


            TotalOperations =
                totalOperations,


            SuccessfulOperations =
                successfulOperations,


            FailedOperations =
                failedOperations
        };
    }



    //===========================================================
    // Normalize Frontend Path
    //===========================================================

    private string NormalizeFrontendPath
    (
        string frontendSolution,

        string path
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(frontendSolution)
        )
        {
            return path;
        }


        if
        (
            string.IsNullOrWhiteSpace(path)
        )
        {
            return path;
        }


        var solutionRoot =
            Path.GetFullPath
            (
                frontendSolution
            );


        var fullPath =
            Path.GetFullPath
            (
                path
            );


        var relativePath =
            Path.GetRelativePath
            (
                solutionRoot,

                fullPath
            );


        if
        (
            relativePath == "."
        )
        {
            return solutionRoot;
        }


        var segments =
            relativePath.Split
            (
                new char[]
                {
                    Path.DirectorySeparatorChar,

                    Path.AltDirectorySeparatorChar
                },

                StringSplitOptions.RemoveEmptyEntries
            );


        for
        (
            var index = 0;

            index < segments.Length;

            index++
        )
        {
            segments[index] =
                segments[index]
                    .Trim()
                    .ToLowerInvariant();
        }


        var normalizedRelativePath =
            segments.Length == 0
                ? string.Empty
                : Path.Combine
                (
                    segments
                );


        return Path.Combine
        (
            solutionRoot,

            normalizedRelativePath
        );
    }



    //===========================================================
    // Normalize Submenu Folder
    //===========================================================

    private string NormalizeSubmenuFolder
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        var menuFolder =
            NormalizeFrontendPath
            (
                synchronization.FrontendSolution,

                synchronization.FrontendMenuFolder
            );


        if
        (
            string.IsNullOrWhiteSpace(menuFolder)
        )
        {
            return menuFolder;
        }


        var submenuName =
            synchronization.SubmenuName;


        if
        (
            string.IsNullOrWhiteSpace(submenuName)
        )
        {
            submenuName =
                Path.GetFileName
                (
                    synchronization.FrontendSubmenuFolder
                );
        }


        if
        (
            string.IsNullOrWhiteSpace(submenuName)
        )
        {
            submenuName =
                synchronization.SubmenuCode;
        }


        submenuName =
            CreateRouteName
            (
                submenuName
            );


        return Path.Combine
        (
            menuFolder,

            "pages",

            submenuName
        );
    }



    //===========================================================
    // Normalize Frontend Core File
    //===========================================================

    private string NormalizeFrontendCoreFile
    (
        string frontendSolution,

        string menuFolder,

        string configuredFilePath,

        string requiredFolder,

        string requiredSuffix
    )
    {
        var normalizedMenuFolder =
            NormalizeFrontendPath
            (
                frontendSolution,

                menuFolder
            );


        if
        (
            string.IsNullOrWhiteSpace(normalizedMenuFolder)
        )
        {
            return configuredFilePath;
        }


        var fileName =
            Path.GetFileName
            (
                configuredFilePath
            );


        if
        (
            string.IsNullOrWhiteSpace(fileName)
        )
        {
            return configuredFilePath;
        }


        fileName =
            fileName
                .Trim()
                .ToLowerInvariant();


        if
        (
            !fileName.EndsWith
            (
                requiredSuffix,

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var baseName =
                Path.GetFileNameWithoutExtension
                (
                    Path.GetFileNameWithoutExtension
                    (
                        fileName
                    )
                );


            baseName =
                baseName
                    .Replace
                    (
                        ".model",
                        string.Empty,
                        StringComparison.OrdinalIgnoreCase
                    )
                    .Replace
                    (
                        ".service",
                        string.Empty,
                        StringComparison.OrdinalIgnoreCase
                    )
                    .Replace
                    (
                        ".routes",
                        string.Empty,
                        StringComparison.OrdinalIgnoreCase
                    )
                    .Trim()
                    .ToLowerInvariant();


            fileName =
                baseName
                +
                requiredSuffix.ToLowerInvariant();
        }


        return Path.Combine
        (
            normalizedMenuFolder,

            requiredFolder,

            fileName
        );
    }



    //===========================================================
    // Normalize Frontend Page File
    //===========================================================

    private string NormalizeFrontendPageFile
    (
        string folderPath,

        string configuredFilePath,

        string requiredSuffix
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(folderPath)
        )
        {
            return configuredFilePath;
        }


        if
        (
            string.IsNullOrWhiteSpace(configuredFilePath)
        )
        {
            return configuredFilePath;
        }


        var fileName =
            Path.GetFileName
            (
                configuredFilePath
            );


        if
        (
            string.IsNullOrWhiteSpace(fileName)
        )
        {
            return configuredFilePath;
        }


        fileName =
            fileName
                .Trim()
                .ToLowerInvariant();


        if
        (
            !fileName.EndsWith
            (
                requiredSuffix,

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var baseName =
                Path.GetFileNameWithoutExtension
                (
                    fileName
                );


            fileName =
                baseName
                +
                requiredSuffix.ToLowerInvariant();
        }


        return Path.Combine
        (
            folderPath,

            fileName
        );
    }



    //===========================================================
    // Create Empty File
    //===========================================================

    private async Task CreateEmptyFileAsync
    (
        string filePath,

        bool parentDirectoryMustExist,

        Action onSuccess,

        Action onFailure
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(filePath)
        )
        {
            return;
        }


        filePath =
            Path.GetFullPath
            (
                filePath
            );


        await NormalizeExistingFileCaseAsync
        (
            filePath
        );


        if
        (
            File.Exists(filePath)
        )
        {
            onSuccess();

            await Task.CompletedTask;

            return;
        }


        try
        {
            var parentDirectory =
                Path.GetDirectoryName
                (
                    filePath
                );


            if
            (
                parentDirectoryMustExist
                &&
                (
                    string.IsNullOrWhiteSpace(parentDirectory)
                    ||
                    !Directory.Exists(parentDirectory)
                )
            )
            {
                throw new DirectoryNotFoundException
                (
                    $"Required existing frontend folder was not found: {parentDirectory}"
                );
            }


            if
            (
                !parentDirectoryMustExist
                &&
                !string.IsNullOrWhiteSpace(parentDirectory)
                &&
                !Directory.Exists(parentDirectory)
            )
            {
                Directory.CreateDirectory
                (
                    parentDirectory
                );
            }


            await File.WriteAllTextAsync
            (
                filePath,

                string.Empty
            );


            if
            (
                File.Exists(filePath)
            )
            {
                onSuccess();
            }
            else
            {
                onFailure();
            }
        }
        catch
        {
            onFailure();

            throw;
        }
    }



    //===========================================================
    // Normalize Existing File Case
    //===========================================================

    private async Task NormalizeExistingFileCaseAsync
    (
        string canonicalFilePath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(canonicalFilePath)
        )
        {
            return;
        }


        canonicalFilePath =
            Path.GetFullPath
            (
                canonicalFilePath
            );


        var parentDirectory =
            Path.GetDirectoryName
            (
                canonicalFilePath
            );


        if
        (
            string.IsNullOrWhiteSpace(parentDirectory)
        )
        {
            return;
        }


        if
        (
            !Directory.Exists(parentDirectory)
        )
        {
            return;
        }


        var canonicalFileName =
            Path.GetFileName
            (
                canonicalFilePath
            );


        var existingFiles =
            Directory
                .GetFiles
                (
                    parentDirectory
                );


        var matchingFiles =
            existingFiles
                .Where
                (
                    file =>
                        string.Equals
                        (
                            Path.GetFileName(file),

                            canonicalFileName,

                            StringComparison.OrdinalIgnoreCase
                        )
                )
                .ToList();


        if
        (
            matchingFiles.Count == 0
        )
        {
            return;
        }


        foreach
        (
            var existingFile in matchingFiles
        )
        {
            if
            (
                string.Equals
                (
                    existingFile,

                    canonicalFilePath,

                    StringComparison.Ordinal
                )
            )
            {
                continue;
            }


            var temporaryFilePath =
                Path.Combine
                (
                    parentDirectory,

                    "."
                    +
                    Guid.NewGuid().ToString("N")
                    +
                    ".case-normalization.tmp"
                );


            File.Move
            (
                existingFile,

                temporaryFilePath
            );


            File.Move
            (
                temporaryFilePath,

                canonicalFilePath
            );


            break;
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<SubmenuSynchronizationResultDto> RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization == null
        )
        {
            throw new ArgumentNullException
            (
                nameof(synchronization)
            );
        }


        await DeleteFrontendStructureAsync
        (
            synchronization
        );


        return new SubmenuSynchronizationResultDto
        {
            Success =
                true,


            Message =
                "Submenu frontend rollback completed successfully.",


            SynchronizedDate =
                DateTime.UtcNow
        };
    }



    //===========================================================
    // Delete Frontend Structure
    //===========================================================

    private async Task DeleteFrontendStructureAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        var submenuFolder =
            NormalizeSubmenuFolder
            (
                synchronization
            );


        var formFolder =
            Path.Combine
            (
                submenuFolder,

                "form"
            );


        var listFolder =
            Path.Combine
            (
                submenuFolder,

                "list"
            );



        //=======================================================
        // Delete Form TypeScript File
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendPageFile
            (
                formFolder,

                synchronization.FrontendSubmenuFormTsFile,

                ".ts"
            )
        );



        //=======================================================
        // Delete Form HTML File
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendPageFile
            (
                formFolder,

                synchronization.FrontendSubmenuFormHtmlFile,

                ".html"
            )
        );



        //=======================================================
        // Delete Form CSS File
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendPageFile
            (
                formFolder,

                synchronization.FrontendSubmenuFormCssFile,

                ".css"
            )
        );



        //=======================================================
        // Delete List TypeScript File
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendPageFile
            (
                listFolder,

                synchronization.FrontendSubmenuListTsFile,

                ".ts"
            )
        );



        //=======================================================
        // Delete List HTML File
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendPageFile
            (
                listFolder,

                synchronization.FrontendSubmenuListHtmlFile,

                ".html"
            )
        );



        //=======================================================
        // Delete List CSS File
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendPageFile
            (
                listFolder,

                synchronization.FrontendSubmenuListCssFile,

                ".css"
            )
        );



        //=======================================================
        // Delete Model
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendCoreFile
            (
                synchronization.FrontendSolution,

                synchronization.FrontendMenuFolder,

                synchronization.FrontendSubmenuModelFile,

                "models",

                ".model.ts"
            )
        );



        //=======================================================
        // Delete Service
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendCoreFile
            (
                synchronization.FrontendSolution,

                synchronization.FrontendMenuFolder,

                synchronization.FrontendSubmenuServiceFile,

                "services",

                ".service.ts"
            )
        );



        //=======================================================
        // Delete Submenu Route
        //=======================================================

        await DeleteFileAsync
        (
            NormalizeFrontendCoreFile
            (
                synchronization.FrontendSolution,

                synchronization.FrontendMenuFolder,

                synchronization.FrontendSubmenuRouteFile,

                "routes",

                ".routes.ts"
            )
        );



        //=======================================================
        // Remove Empty Form Folder
        //=======================================================

        await DeleteEmptyFolderAsync
        (
            formFolder
        );



        //=======================================================
        // Remove Empty List Folder
        //=======================================================

        await DeleteEmptyFolderAsync
        (
            listFolder
        );



        //=======================================================
        // Remove Empty Submenu Folder
        //=======================================================

        await DeleteEmptyFolderAsync
        (
            submenuFolder
        );
    }



    //===========================================================
    // Delete File
    //===========================================================

    private async Task DeleteFileAsync
    (
        string filePath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(filePath)
        )
        {
            return;
        }


        filePath =
            Path.GetFullPath
            (
                filePath
            );


        if
        (
            !File.Exists(filePath)
        )
        {
            return;
        }


        await _fileRemover.DeleteFileAsync
        (
            filePath
        );
    }



    //===========================================================
    // Create Folder
    //===========================================================

    private async Task CreateFolderAsync
    (
        string folderPath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(folderPath)
        )
        {
            return;
        }


        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        if
        (
            !Directory.Exists(folderPath)
        )
        {
            Directory.CreateDirectory
            (
                folderPath
            );
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Delete Empty Folder
    //===========================================================

    private async Task DeleteEmptyFolderAsync
    (
        string folderPath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(folderPath)
        )
        {
            return;
        }


        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        if
        (
            !Directory.Exists(folderPath)
        )
        {
            return;
        }


        var entries =
            Directory.GetFileSystemEntries
            (
                folderPath
            );


        if
        (
            entries.Length == 0
        )
        {
            Directory.Delete
            (
                folderPath
            );
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Create Route Name
    //===========================================================

    private static string CreateRouteName
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(value)
        )
        {
            return string.Empty;
        }


        var characters =
            value
                .Trim()
                .ToLowerInvariant()
                .Select
                (
                    character =>
                        char.IsLetterOrDigit(character)
                            ? character
                            : '-'
                )
                .ToArray();


        var route =
            new string
            (
                characters
            );


        while
        (
            route.Contains
            (
                "--",
                StringComparison.Ordinal
            )
        )
        {
            route =
                route.Replace
                (
                    "--",
                    "-",
                    StringComparison.Ordinal
                );
        }


        return route.Trim('-');
    }

}