//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
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
        //=======================================================
        // Validate Synchronization
        //=======================================================

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


        //=======================================================
        // Validate Frontend Solution
        //=======================================================

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


        //=======================================================
        // Validate Frontend Solution Exists
        //=======================================================

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
        // Create Submenu Folder
        //=======================================================
        //
        // Existing Menu
        //     |
        //     +-- pages
        //          |
        //          +-- <submenu>
        //
        // The existing pages folder is NEVER created.
        //
        //=======================================================

        await CreateFolderAsync
        (
            synchronization.FrontendSubmenuFolder
        );



        //=======================================================
        // Create Form Folder
        //=======================================================

        await CreateFolderAsync
        (
            synchronization.FrontendFormFolder
        );



        //=======================================================
        // Create List Folder
        //=======================================================

        await CreateFolderAsync
        (
            synchronization.FrontendListFolder
        );



        //=======================================================
        // Create Model File
        //=======================================================
        //
        // Existing Menu
        //     |
        //     +-- models
        //          |
        //          +-- <submenu>.model.ts
        //
        // IMPORTANT:
        //
        // The "models" folder belongs to the existing Menu.
        //
        // This engine NEVER creates the models folder.
        //
        // The folder must already exist.
        //
        // EMPTY FILE ONLY.
        //
        //=======================================================

        await CreateEmptyFileAsync
        (
            synchronization.FrontendSubmenuModelFile,

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
        //
        // Existing Menu
        //     |
        //     +-- services
        //          |
        //          +-- <submenu>.service.ts
        //
        // IMPORTANT:
        //
        // The "services" folder belongs to the existing Menu.
        //
        // This engine NEVER creates the services folder.
        //
        // The folder must already exist.
        //
        // EMPTY FILE ONLY.
        //
        //=======================================================

        await CreateEmptyFileAsync
        (
            synchronization.FrontendSubmenuServiceFile,

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
        // Create Route File
        //=======================================================
        //
        // Existing Menu
        //     |
        //     +-- routes
        //          |
        //          +-- <submenu>.routes.ts
        //
        // IMPORTANT:
        //
        // The "routes" folder belongs to the existing Menu.
        //
        // This engine NEVER creates the routes folder.
        //
        // The folder must already exist.
        //
        // EMPTY FILE ONLY.
        //
        // This engine does NOT modify the existing Menu route.
        //
        //=======================================================

        await CreateEmptyFileAsync
        (
            synchronization.FrontendSubmenuRouteFile,

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
            synchronization.FrontendSubmenuFormTsFile,

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
            synchronization.FrontendSubmenuFormHtmlFile,

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
            synchronization.FrontendSubmenuFormCssFile,

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
            synchronization.FrontendSubmenuListTsFile,

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
            synchronization.FrontendSubmenuListHtmlFile,

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
            synchronization.FrontendSubmenuListCssFile,

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
        //=======================================================
        // Validate Path
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
        // Normalize Path
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
            onSuccess();

            await Task.CompletedTask;

            return;
        }


        try
        {
            //===================================================
            // Resolve Parent Directory
            //===================================================

            var parentDirectory =
                Path.GetDirectoryName
                (
                    filePath
                );


            //===================================================
            // Validate Parent Directory
            //===================================================

            if
            (
                parentDirectoryMustExist
                &&
                (
                    string.IsNullOrWhiteSpace
                    (
                        parentDirectory
                    )
                    ||
                    !Directory.Exists
                    (
                        parentDirectory
                    )
                )
            )
            {
                throw new DirectoryNotFoundException
                (
                    $"Required existing frontend folder was not found: {parentDirectory}"
                );
            }


            //===================================================
            // Create Parent Directory
            //===================================================
            //
            // Only files belonging to newly-created submenu
            // folders are allowed to create their parent.
            //
            // Existing Menu folders such as:
            //
            // models
            // services
            // routes
            //
            // are NEVER created here.
            //
            //===================================================

            if
            (
                !parentDirectoryMustExist
                &&
                !string.IsNullOrWhiteSpace
                (
                    parentDirectory
                )
                &&
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


            //===================================================
            // Create EMPTY File
            //===================================================
            //
            // No template.
            // No code.
            // No placeholder replacement.
            //
            //===================================================

            await File.WriteAllTextAsync
            (
                filePath,

                string.Empty
            );


            //===================================================
            // Confirm File Created
            //===================================================

            if
            (
                File.Exists
                (
                    filePath
                )
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
        //=======================================================
        // Delete Form TypeScript File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuFormTsFile
        );


        //=======================================================
        // Delete Form HTML File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuFormHtmlFile
        );


        //=======================================================
        // Delete Form CSS File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuFormCssFile
        );


        //=======================================================
        // Delete List TypeScript File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuListTsFile
        );


        //=======================================================
        // Delete List HTML File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuListHtmlFile
        );


        //=======================================================
        // Delete List CSS File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuListCssFile
        );


        //=======================================================
        // Delete Model File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuModelFile
        );


        //=======================================================
        // Delete Service File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuServiceFile
        );


        //=======================================================
        // Delete Route File
        //=======================================================

        await DeleteFileAsync
        (
            synchronization.FrontendSubmenuRouteFile
        );


        //=======================================================
        // Remove Empty Form Folder
        //=======================================================

        await DeleteEmptyFolderAsync
        (
            synchronization.FrontendFormFolder
        );


        //=======================================================
        // Remove Empty List Folder
        //=======================================================

        await DeleteEmptyFolderAsync
        (
            synchronization.FrontendListFolder
        );


        //=======================================================
        // Remove Empty Submenu Folder
        //=======================================================
        //
        // Only pages/<submenu> is eligible.
        //
        // FrontendPagesFolder is NEVER deleted.
        //
        //=======================================================

        await DeleteEmptyFolderAsync
        (
            synchronization.FrontendSubmenuFolder
        );


        //=======================================================
        // IMPORTANT
        //=======================================================
        //
        // These existing folders are NEVER deleted:
        //
        // FrontendPagesFolder
        // Existing Menu/models
        // Existing Menu/services
        // Existing Menu/routes
        //
        //=======================================================
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
        // Validate Path
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
        // Normalize Path
        //=======================================================

        filePath =
            Path.GetFullPath
            (
                filePath
            );


        //=======================================================
        // File Exists
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
        //=======================================================
        // Validate Path
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
        // Normalize Path
        //=======================================================

        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        //=======================================================
        // Create Folder
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
    // Delete Empty Folder
    //===========================================================

    private async Task DeleteEmptyFolderAsync
    (
        string folderPath
    )
    {
        //=======================================================
        // Validate Path
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
        // Normalize Path
        //=======================================================

        folderPath =
            Path.GetFullPath
            (
                folderPath
            );


        //=======================================================
        // Folder Exists
        //=======================================================

        if
        (
            !Directory.Exists
            (
                folderPath
            )
        )
        {
            return;
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

}