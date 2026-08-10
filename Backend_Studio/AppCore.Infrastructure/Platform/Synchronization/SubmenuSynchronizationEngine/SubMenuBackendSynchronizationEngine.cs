//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using AppCore.Application.Platform.SubmenuBackendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;


//===============================================================
// Submenu Backend Synchronization Engine
//===============================================================

public class SubmenuBackendSynchronizationEngine
    : ISubmenuBackendSynchronizationEngine
{

    //===========================================================
    // Constructor
    //===========================================================

    public SubmenuBackendSynchronizationEngine()
    {
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<SubmenuSynchronizationResultDto> SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        ValidateSynchronization
        (
            synchronization
        );


        await PrepareBackendTargetAsync
        (
            synchronization
        );


        return await CreateBackendStructureAsync
        (
            synchronization
        );
    }



    //===========================================================
    // Validate
    //===========================================================

    private void ValidateSynchronization
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
    }



    //===========================================================
    // Backend Preparation
    //===========================================================

    private async Task PrepareBackendTargetAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Backend Solution
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.BackendSolution
            )
        )
        {
            throw new InvalidOperationException
            (
                "Backend solution path is not configured."
            );
        }


        //=======================================================
        // Validate Backend Solution Exists
        //=======================================================

        if
        (
            !Directory.Exists
            (
                synchronization.BackendSolution
            )
        )
        {
            throw new DirectoryNotFoundException
            (
                $"Backend solution was not found: {synchronization.BackendSolution}"
            );
        }


        await Task.CompletedTask;
    }



    //===========================================================
    // Create Backend Structure
    //===========================================================

    private async Task<SubmenuSynchronizationResultDto>
    CreateBackendStructureAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Backend Folders
        //=======================================================
        //
        // These are the explicitly configured folders.
        //
        //=======================================================

        var folders =
            new List<string>
            {
                synchronization.BackendApplicationSubMenuFolder,

                synchronization.BackendApplicationDtosFolder,

                synchronization.BackendApplicationInterfacesFolder
            };


        folders =
            folders
                .Where
                (
                    x =>
                        !string.IsNullOrWhiteSpace(x)
                )
                .Select
                (
                    Path.GetFullPath
                )
                .Distinct
                (
                    StringComparer.OrdinalIgnoreCase
                )
                .ToList();



        //=======================================================
        // Backend Files
        //=======================================================
        //
        // EMPTY files only.
        //
        // No templates.
        // No source code.
        // No placeholder replacement.
        //
        //=======================================================

        var files =
            new List<string>
            {
                synchronization.BackendControllerFile,

                synchronization.BackendSubMenuDtoFile,

                synchronization.BackendCreateSubMenuDtoFile,

                synchronization.BackendUpdateSubMenuDtoFile,

                synchronization.BackendSubMenuDefaultsDtoFile,

                synchronization.BackendSubMenuRepositoryInterfaceFile,

                synchronization.BackendSubMenuEntityFile,

                synchronization.BackendSubMenuConfigurationFile,

                synchronization.BackendSubMenuRepositoryFile
            };


        files =
            files
                .Where
                (
                    x =>
                        !string.IsNullOrWhiteSpace(x)
                )
                .Select
                (
                    Path.GetFullPath
                )
                .Distinct
                (
                    StringComparer.OrdinalIgnoreCase
                )
                .ToList();



        //=======================================================
        // Validate Configuration
        //=======================================================

        if
        (
            folders.Count == 0
            &&
            files.Count == 0
        )
        {
            return new SubmenuSynchronizationResultDto
            {
                Success =
                    false,


                Message =
                    "No backend folder or file configuration was provided."
            };
        }



        //=======================================================
        // Operation Counters
        //=======================================================

        var totalOperations =
            folders.Count +
            files.Count;


        var successfulOperations =
            0;


        var failedOperations =
            0;



        //=======================================================
        // Create Folders
        //=======================================================

        foreach
        (
            var folder in folders
        )
        {
            try
            {
                await CreateFolderAsync
                (
                    folder
                );


                successfulOperations++;
            }
            catch
            {
                failedOperations++;
            }
        }



        //=======================================================
        // Create Files
        //=======================================================

        foreach
        (
            var file in files
        )
        {
            try
            {
                await CreateEmptyFileAsync
                (
                    file
                );


                successfulOperations++;
            }
            catch
            {
                failedOperations++;
            }
        }



        //=======================================================
        // Result
        //=======================================================

        return new SubmenuSynchronizationResultDto
        {
            Success =
                failedOperations == 0,


            Message =
                failedOperations == 0
                    ? "Submenu backend synchronization completed successfully."
                    : "Submenu backend synchronization completed with errors.",


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
    // Create Folder
    //===========================================================

    private async Task CreateFolderAsync
    (
        string folderPath
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                folderPath
            )
        )
        {
            return;
        }


        //=======================================================
        // Normalize
        //=======================================================

        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        //=======================================================
        // Create
        //=======================================================

        if
        (
            !Directory.Exists
            (
                folderPath
            )
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
    // Create Empty File
    //===========================================================

    private async Task CreateEmptyFileAsync
    (
        string filePath
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                filePath
            )
        )
        {
            return;
        }


        //=======================================================
        // Normalize
        //=======================================================

        filePath =
            Path.GetFullPath
            (
                filePath
            );


        //=======================================================
        // Existing File
        //=======================================================
        //
        // Never overwrite an existing file.
        //
        //=======================================================

        if
        (
            File.Exists
            (
                filePath
            )
        )
        {
            await Task.CompletedTask;

            return;
        }


        //=======================================================
        // Create Parent Directory
        //=======================================================

        var parentDirectory =
            Path.GetDirectoryName
            (
                filePath
            );


        if
        (
            !string.IsNullOrWhiteSpace
            (
                parentDirectory
            )
        )
        {
            if
            (
                !Directory.Exists
                (
                    parentDirectory
                )
            )
            {
                Directory.CreateDirectory
                (
                    parentDirectory
                );
            }
        }


        //=======================================================
        // Create EMPTY File
        //=======================================================

        await File.WriteAllTextAsync
        (
            filePath,

            string.Empty
        );
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<SubmenuSynchronizationResultDto> RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        ValidateSynchronization
        (
            synchronization
        );


        return await DeleteBackendStructureAsync
        (
            synchronization
        );
    }



    //===========================================================
    // Delete Backend Structure
    //===========================================================

    private async Task<SubmenuSynchronizationResultDto>
    DeleteBackendStructureAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Backend Files
        //=======================================================

        var files =
            new List<string>
            {
                synchronization.BackendControllerFile,

                synchronization.BackendSubMenuDtoFile,

                synchronization.BackendCreateSubMenuDtoFile,

                synchronization.BackendUpdateSubMenuDtoFile,

                synchronization.BackendSubMenuDefaultsDtoFile,

                synchronization.BackendSubMenuRepositoryInterfaceFile,

                synchronization.BackendSubMenuEntityFile,

                synchronization.BackendSubMenuConfigurationFile,

                synchronization.BackendSubMenuRepositoryFile
            };


        files =
            files
                .Where
                (
                    x =>
                        !string.IsNullOrWhiteSpace(x)
                )
                .Select
                (
                    Path.GetFullPath
                )
                .Distinct
                (
                    StringComparer.OrdinalIgnoreCase
                )
                .ToList();



        //=======================================================
        // Backend Folders
        //=======================================================
        //
        // IMPORTANT:
        //
        // Deletion MUST happen from the deepest folder
        // toward the parent folder.
        //
        // Structure:
        //
        // Submenu
        //     |
        //     +-- DTOs
        //     |
        //     +-- Interfaces
        //
        // Therefore:
        //
        // 1. DTOs
        // 2. Interfaces
        // 3. Submenu
        //
        // Otherwise the Submenu folder is still non-empty
        // when it is checked and will remain behind.
        //
        //=======================================================

        var folders =
            new List<string>
            {
                synchronization.BackendApplicationDtosFolder,

                synchronization.BackendApplicationInterfacesFolder,

                synchronization.BackendApplicationSubMenuFolder
            };


        folders =
            folders
                .Where
                (
                    x =>
                        !string.IsNullOrWhiteSpace(x)
                )
                .Select
                (
                    Path.GetFullPath
                )
                .Distinct
                (
                    StringComparer.OrdinalIgnoreCase
                )
                .OrderByDescending
                (
                    x =>
                        x.Length
                )
                .ToList();



        //=======================================================
        // Operation Counters
        //=======================================================
        //
        // Files and folders are both rollback operations.
        //
        //=======================================================

        var totalOperations =
            files.Count +
            folders.Count;


        var successfulOperations =
            0;


        var failedOperations =
            0;



        //=======================================================
        // Delete Files
        //=======================================================

        foreach
        (
            var file in files
        )
        {
            try
            {
                await DeleteFileAsync
                (
                    file
                );


                successfulOperations++;
            }
            catch
            {
                failedOperations++;
            }
        }



        //=======================================================
        // Remove Empty Folders
        //=======================================================
        //
        // IMPORTANT:
        //
        // This is intentionally performed AFTER all files
        // have been deleted.
        //
        // Folders are processed deepest-first.
        //
        // Existing parent folders are preserved because
        // they will only be deleted when they are actually
        // empty and are explicitly part of this submenu
        // configuration.
        //
        //=======================================================

        foreach
        (
            var folder in folders
        )
        {
            try
            {
                var deleted =
                    await DeleteEmptyFolderAsync
                    (
                        folder
                    );


                if
                (
                    deleted
                )
                {
                    successfulOperations++;
                }
            }
            catch
            {
                failedOperations++;
            }
        }



        //=======================================================
        // Result
        //=======================================================

        return new SubmenuSynchronizationResultDto
        {
            Success =
                failedOperations == 0,


            Message =
                failedOperations == 0
                    ? "Submenu backend rollback completed successfully."
                    : "Submenu backend rollback completed with errors.",


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
    // Delete File
    //===========================================================

    private async Task DeleteFileAsync
    (
        string filePath
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                filePath
            )
        )
        {
            return;
        }


        //=======================================================
        // Normalize
        //=======================================================

        filePath =
            Path.GetFullPath
            (
                filePath
            );


        //=======================================================
        // File Does Not Exist
        //=======================================================

        if
        (
            !File.Exists
            (
                filePath
            )
        )
        {
            return;
        }


        //=======================================================
        // Delete
        //=======================================================

        File.Delete
        (
            filePath
        );


        await Task.CompletedTask;
    }



    //===========================================================
    // Delete Empty Folder
    //===========================================================

    private async Task<bool> DeleteEmptyFolderAsync
    (
        string folderPath
    )
    {
        //=======================================================
        // Validate
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                folderPath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Normalize
        //=======================================================

        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        //=======================================================
        // Folder Does Not Exist
        //=======================================================

        if
        (
            !Directory.Exists
            (
                folderPath
            )
        )
        {
            return false;
        }


        //=======================================================
        // Check Contents
        //=======================================================

        var entries =
            Directory.GetFileSystemEntries
            (
                folderPath
            );


        //=======================================================
        // Delete Only If Empty
        //=======================================================

        if
        (
            entries.Length != 0
        )
        {
            return false;
        }


        Directory.Delete
        (
            folderPath
        );


        await Task.CompletedTask;


        return true;
    }

}