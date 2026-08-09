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
        ValidateSynchronization(synchronization);

        await PrepareBackendTargetAsync(synchronization);

        return await CreateBackendStructureAsync(synchronization);
    }

    //===========================================================
    // Validate
    //===========================================================

    private void ValidateSynchronization
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if (synchronization == null)
        {
            throw new ArgumentNullException(
                nameof(synchronization));
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
        if (string.IsNullOrWhiteSpace(
            synchronization.BackendSolution))
        {
            throw new InvalidOperationException(
                "Backend solution path is not configured.");
        }

        if (!Directory.Exists(
            synchronization.BackendSolution))
        {
            throw new DirectoryNotFoundException(
                $"Backend solution was not found: {synchronization.BackendSolution}");
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
        var folders =
            new List<string>
            {
                synchronization.BackendApplicationSubMenuFolder,

                synchronization.BackendApplicationDtosFolder,

                synchronization.BackendApplicationInterfacesFolder
            };

        folders =
            folders
                .Where(x =>
                    !string.IsNullOrWhiteSpace(x))
                .Distinct(
                    StringComparer.OrdinalIgnoreCase)
                .ToList();

        if (folders.Count == 0)
        {
            return new SubmenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "No backend folder configuration was provided."
            };
        }

        var success = 0;

        var failed = 0;

        foreach (var folder in folders)
        {
            try
            {
                await CreateFolderAsync(folder);

                success++;
            }
            catch
            {
                failed++;
            }
        }

        return new SubmenuSynchronizationResultDto
        {
            Success = failed == 0,

            Message =
                failed == 0
                    ? "Submenu backend folder synchronization completed successfully."
                    : "One or more backend folders failed.",

            SynchronizedDate = DateTime.UtcNow,

            TotalOperations = folders.Count,

            SuccessfulOperations = success,

            FailedOperations = failed
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
        if (string.IsNullOrWhiteSpace(folderPath))
        {
            return;
        }

        folderPath =
            Path.GetFullPath(folderPath);

        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
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
        ValidateSynchronization(synchronization);

        return await DeleteBackendStructureAsync(
            synchronization);
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
        var folders =
            new List<string>
            {
                synchronization.BackendApplicationSubMenuFolder,

                synchronization.BackendApplicationDtosFolder,

                synchronization.BackendApplicationInterfacesFolder
            };

        folders =
            folders
                .Where(x =>
                    !string.IsNullOrWhiteSpace(x))
                .Distinct(
                    StringComparer.OrdinalIgnoreCase)
                .ToList();

        var success = 0;

        var failed = 0;

        foreach (var folder in folders)
        {
            try
            {
                await DeleteFolderAsync(folder);

                success++;
            }
            catch
            {
                failed++;
            }
        }

        return new SubmenuSynchronizationResultDto
        {
            Success = failed == 0,

            Message =
                failed == 0
                    ? "Submenu backend rollback completed successfully."
                    : "One or more folders could not be removed.",

            SynchronizedDate = DateTime.UtcNow,

            TotalOperations = folders.Count,

            SuccessfulOperations = success,

            FailedOperations = failed
        };
    }

    //===========================================================
    // Delete Folder
    //===========================================================

    private async Task DeleteFolderAsync
    (
        string folderPath
    )
    {
        if (string.IsNullOrWhiteSpace(folderPath))
        {
            return;
        }

        folderPath =
            Path.GetFullPath(folderPath);

        if (!Directory.Exists(folderPath))
        {
            return;
        }

        if (Directory.GetFileSystemEntries(folderPath).Length == 0)
        {
            Directory.Delete(folderPath);
        }

        await Task.CompletedTask;
    }
}