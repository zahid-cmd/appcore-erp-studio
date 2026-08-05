//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Threading.Tasks;

using AppCore.Application.Platform.BackendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;

//===============================================================
// Backend Synchronization Engine
//===============================================================

public class BackendSynchronizationEngine
    : IBackendSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> SynchronizeAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await PrepareBackendTargetAsync
        (
            synchronization
        );

        await CreateBackendStructureAsync
        (
            synchronization
        );

        return new ModuleSynchronizationResultDto
        {
            Success = true,

            Message =
                "Backend synchronization completed successfully."
        };
    }
    //===========================================================
    // Backend Preparation
    //===========================================================

    private async Task PrepareBackendTargetAsync
    (
        ModuleSynchronizationDto synchronization
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
        // Backend Solution Exists
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

    private async Task CreateBackendStructureAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Controller
        //=======================================================

        await CreateControllerFolderAsync
        (
            synchronization
        );

        //=======================================================
        // Application
        //=======================================================

        await CreateApplicationFolderAsync
        (
            synchronization
        );

        //=======================================================
        // Domain
        //=======================================================

        await CreateDomainFolderAsync
        (
            synchronization
        );

        //=======================================================
        // Repository
        //=======================================================

        await CreateRepositoryFolderAsync
        (
            synchronization
        );

        //=======================================================
        // Configuration
        //=======================================================

        await CreateConfigurationFolderAsync
        (
            synchronization
        );
    }
    //===========================================================
    // Controller Folder
    //===========================================================

    private async Task CreateControllerFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.BackendControllerFolder
        );
    }

    //===========================================================
    // Application Folder
    //===========================================================

    private async Task CreateApplicationFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.BackendApplicationFolder
        );
    }

    //===========================================================
    // Domain Folder
    //===========================================================

    private async Task CreateDomainFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.BackendEntityFolder
        );
    }

    //===========================================================
    // Repository Folder
    //===========================================================

    private async Task CreateRepositoryFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.BackendRepositoryFolder
        );
    }

    //===========================================================
    // Configuration Folder
    //===========================================================

    private async Task CreateConfigurationFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await CreateFolderAsync
        (
            synchronization.BackendConfigurationFolder
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
    // Rollback
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> RollbackAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteBackendStructureAsync
        (
            synchronization
        );

        return new ModuleSynchronizationResultDto
        {
            Success = true,

            Message =
                "Backend rollback completed successfully."
        };
    }

    //===========================================================
    // Delete Backend Structure
    //===========================================================

    private async Task DeleteBackendStructureAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteControllerFolderAsync
        (
            synchronization
        );

        await DeleteApplicationFolderAsync
        (
            synchronization
        );

        await DeleteDomainFolderAsync
        (
            synchronization
        );

        await DeleteRepositoryFolderAsync
        (
            synchronization
        );

        await DeleteConfigurationFolderAsync
        (
            synchronization
        );
    }

    //===========================================================
    // Controller Folder
    //===========================================================

    private async Task DeleteControllerFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteFolderAsync
        (
            synchronization.BackendControllerFolder
        );
    }

    //===========================================================
    // Application Folder
    //===========================================================

    private async Task DeleteApplicationFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteFolderAsync
        (
            synchronization.BackendApplicationFolder
        );
    }

    //===========================================================
    // Domain Folder
    //===========================================================

    private async Task DeleteDomainFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteFolderAsync
        (
            synchronization.BackendEntityFolder
        );
    }

    //===========================================================
    // Repository Folder
    //===========================================================

    private async Task DeleteRepositoryFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteFolderAsync
        (
            synchronization.BackendRepositoryFolder
        );
    }

    //===========================================================
    // Configuration Folder
    //===========================================================

    private async Task DeleteConfigurationFolderAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        await DeleteFolderAsync
        (
            synchronization.BackendConfigurationFolder
        );
    }

    //===========================================================
    // Delete Folder
    //===========================================================

    private async Task DeleteFolderAsync
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
        // Delete Only Empty Folder
        //=======================================================

        if
        (
            Directory.GetFileSystemEntries
            (
                folderPath
            ).Length == 0
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