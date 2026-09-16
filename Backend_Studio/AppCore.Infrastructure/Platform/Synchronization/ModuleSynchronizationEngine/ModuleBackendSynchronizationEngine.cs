//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using AppCore.Application.Platform.BackendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;

//===============================================================
// Module Backend Synchronization Engine
//===============================================================

public class ModuleBackendSynchronizationEngine
    : IBackendSynchronizationEngine
{
    //===========================================================
    // Fields
    //===========================================================

    // (No changes)

    //===========================================================
    // Constructor
    //===========================================================

    public ModuleBackendSynchronizationEngine
    (
        // Keep the existing constructor parameters unchanged
    )
    {
        // Keep the existing constructor body unchanged
    }



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


        await CreateDevelopmentBackupFoldersAsync
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
    // Development Backup Folder Name
    //===========================================================

    private static string CreateDevelopmentBackupFolderName
    (
        string moduleName
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                moduleName
            )
        )
        {
            return string.Empty;
        }


        return new string
        (
            moduleName
                .Where
                (
                    char.IsLetterOrDigit
                )
                .ToArray()
        );
    }



    //===========================================================
    // Development Backup Folders
    //===========================================================

    private async Task CreateDevelopmentBackupFoldersAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.ModuleName
            )
        )
        {
            throw new InvalidOperationException
            (
                "Module name is required to create development backup folders."
            );
        }


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


        var backendStudio =
            Path.GetFullPath
            (
                synchronization.BackendSolution
            );


        var backupModuleName =
            CreateDevelopmentBackupFolderName
            (
                synchronization.ModuleName
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                backupModuleName
            )
        )
        {
            throw new InvalidOperationException
            (
                "A valid module name is required to create development backup folders."
            );
        }


        //=======================================================
        // API Baseline Folder
        //=======================================================

        var apiBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.API",

                "Development_Backup",

                "Baseline_Files",

                backupModuleName
            );


        await CreateFolderAsync
        (
            apiBaselineFolder
        );


        //=======================================================
        // API Restore Folder
        //=======================================================

        var apiRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.API",

                "Development_Backup",

                "Restore_Files",

                backupModuleName
            );


        await CreateFolderAsync
        (
            apiRestoreFolder
        );


        //=======================================================
        // Application DTOs Baseline Folder
        //=======================================================

        var applicationDtosBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Baseline_Files",

                "DTOs",

                backupModuleName
            );


        await CreateFolderAsync
        (
            applicationDtosBaselineFolder
        );


        //=======================================================
        // Application Interfaces Baseline Folder
        //=======================================================

        var applicationInterfacesBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Baseline_Files",

                "Interfaces",

                backupModuleName
            );


        await CreateFolderAsync
        (
            applicationInterfacesBaselineFolder
        );


        //=======================================================
        // Application DTOs Restore Folder
        //=======================================================

        var applicationDtosRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Restore_Files",

                "DTOs",

                backupModuleName
            );


        await CreateFolderAsync
        (
            applicationDtosRestoreFolder
        );


        //=======================================================
        // Application Interfaces Restore Folder
        //=======================================================

        var applicationInterfacesRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Restore_Files",

                "Interfaces",

                backupModuleName
            );


        await CreateFolderAsync
        (
            applicationInterfacesRestoreFolder
        );


        //=======================================================
        // Domain Baseline Folder
        //=======================================================

        var domainBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Domain",

                "Development_Backup",

                "Baseline_Files",

                backupModuleName
            );


        await CreateFolderAsync
        (
            domainBaselineFolder
        );


        //=======================================================
        // Domain Restore Folder
        //=======================================================

        var domainRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Domain",

                "Development_Backup",

                "Restore_Files",

                backupModuleName
            );


        await CreateFolderAsync
        (
            domainRestoreFolder
        );


        //=======================================================
        // Infrastructure Configurations Baseline Folder
        //=======================================================

        var configurationsBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Baseline_Files",

                "Configurations",

                backupModuleName
            );


        await CreateFolderAsync
        (
            configurationsBaselineFolder
        );


        //=======================================================
        // Infrastructure Configurations Restore Folder
        //=======================================================

        var configurationsRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Restore_Files",

                "Configurations",

                backupModuleName
            );


        await CreateFolderAsync
        (
            configurationsRestoreFolder
        );


        //=======================================================
        // Infrastructure Repositories Baseline Folder
        //=======================================================

        var repositoriesBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Baseline_Files",

                "Repositories",

                backupModuleName
            );


        await CreateFolderAsync
        (
            repositoriesBaselineFolder
        );


        //=======================================================
        // Infrastructure Repositories Restore Folder
        //=======================================================

        var repositoriesRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Restore_Files",

                "Repositories",

                backupModuleName
            );


        await CreateFolderAsync
        (
            repositoriesRestoreFolder
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


        await DeleteDevelopmentBackupFoldersAsync
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
    // Development Backup Folders
    //===========================================================

    private async Task DeleteDevelopmentBackupFoldersAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.ModuleName
            )
        )
        {
            return;
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.BackendSolution
            )
        )
        {
            return;
        }


        var backendStudio =
            Path.GetFullPath
            (
                synchronization.BackendSolution
            );


        var backupModuleName =
            CreateDevelopmentBackupFolderName
            (
                synchronization.ModuleName
            );


        if
        (
            string.IsNullOrWhiteSpace
            (
                backupModuleName
            )
        )
        {
            return;
        }


        //=======================================================
        // API Baseline Folder
        //=======================================================

        var apiBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.API",

                "Development_Backup",

                "Baseline_Files",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            apiBaselineFolder
        );


        //=======================================================
        // API Restore Folder
        //=======================================================

        var apiRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.API",

                "Development_Backup",

                "Restore_Files",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            apiRestoreFolder
        );


        //=======================================================
        // Application DTOs Baseline Folder
        //=======================================================

        var applicationDtosBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Baseline_Files",

                "DTOs",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            applicationDtosBaselineFolder
        );


        //=======================================================
        // Application Interfaces Baseline Folder
        //=======================================================

        var applicationInterfacesBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Baseline_Files",

                "Interfaces",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            applicationInterfacesBaselineFolder
        );


        //=======================================================
        // Application DTOs Restore Folder
        //=======================================================

        var applicationDtosRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Restore_Files",

                "DTOs",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            applicationDtosRestoreFolder
        );


        //=======================================================
        // Application Interfaces Restore Folder
        //=======================================================

        var applicationInterfacesRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Application",

                "Development_Backup",

                "Restore_Files",

                "Interfaces",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            applicationInterfacesRestoreFolder
        );


        //=======================================================
        // Domain Baseline Folder
        //=======================================================

        var domainBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Domain",

                "Development_Backup",

                "Baseline_Files",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            domainBaselineFolder
        );


        //=======================================================
        // Domain Restore Folder
        //=======================================================

        var domainRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Domain",

                "Development_Backup",

                "Restore_Files",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            domainRestoreFolder
        );


        //=======================================================
        // Infrastructure Configurations Baseline Folder
        //=======================================================

        var configurationsBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Baseline_Files",

                "Configurations",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            configurationsBaselineFolder
        );


        //=======================================================
        // Infrastructure Configurations Restore Folder
        //=======================================================

        var configurationsRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Restore_Files",

                "Configurations",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            configurationsRestoreFolder
        );


        //=======================================================
        // Infrastructure Repositories Baseline Folder
        //=======================================================

        var repositoriesBaselineFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Baseline_Files",

                "Repositories",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            repositoriesBaselineFolder
        );


        //=======================================================
        // Infrastructure Repositories Restore Folder
        //=======================================================

        var repositoriesRestoreFolder =
            Path.Combine
            (
                backendStudio,

                "AppCore.Infrastructure",

                "Development_Backup",

                "Restore_Files",

                "Repositories",

                backupModuleName
            );


        await DeleteFolderAsync
        (
            repositoriesRestoreFolder
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