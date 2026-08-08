//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using AppCore.Application.Platform.MenuBackendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization;


//===============================================================
// Menu Backend Synchronization Engine
//===============================================================

public class MenuBackendSynchronizationEngine
    : IMenuBackendSynchronizationEngine
{


    //===========================================================
    // Constructor
    //===========================================================

    public MenuBackendSynchronizationEngine()
    {
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<MenuSynchronizationResultDto> SynchronizeAsync
    (
        MenuSynchronizationDto synchronization
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
        MenuSynchronizationDto synchronization
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
        MenuSynchronizationDto synchronization
    )
    {
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

    private async Task<MenuSynchronizationResultDto>
    CreateBackendStructureAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        var folders =
            new List<string>
            {
                // AppCore.Api
                synchronization.BackendControllerFolder,


                // AppCore.Application
                synchronization.BackendApplicationFolder,


                // AppCore.Domain
                synchronization.BackendDomainFolder,


                // AppCore.Infrastructure
                synchronization.BackendRepositoryFolder,


                // AppCore.Infrastructure
                synchronization.BackendConfigurationFolder
            };


        folders =
            folders

            .Where
            (
                x =>
                    !string.IsNullOrWhiteSpace(x)
            )

            .Distinct
            (
                StringComparer.OrdinalIgnoreCase
            )

            .ToList();



        if
        (
            folders.Count == 0
        )
        {
            return new MenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "No backend folder configuration was provided."
            };
        }



        var success =
            0;


        var failed =
            0;



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

                success++;
            }

            catch
            {
                failed++;
            }
        }



        return new MenuSynchronizationResultDto
        {
            Success =
                failed == 0,


            Message =
                failed == 0

                ?

                "Menu backend folder synchronization completed successfully."

                :

                "One or more backend folders failed.",


            SynchronizedDate =
                DateTime.UtcNow,


            TotalOperations =
                folders.Count,


            SuccessfulOperations =
                success,


            FailedOperations =
                failed
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
    // Rollback
    //===========================================================

    public async Task<MenuSynchronizationResultDto> RollbackAsync
    (
        MenuSynchronizationDto synchronization
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

    private async Task<MenuSynchronizationResultDto>
    DeleteBackendStructureAsync
    (
        MenuSynchronizationDto synchronization
    )
    {

        var folders =
            new List<string>
            {
                synchronization.BackendControllerFolder,

                synchronization.BackendApplicationFolder,

                synchronization.BackendDomainFolder,

                synchronization.BackendRepositoryFolder,

                synchronization.BackendConfigurationFolder
            };


        folders =
            folders

            .Where
            (
                x =>
                    !string.IsNullOrWhiteSpace(x)
            )

            .Distinct
            (
                StringComparer.OrdinalIgnoreCase
            )

            .ToList();



        var success =
            0;


        var failed =
            0;



        foreach
        (
            var folder in folders
        )
        {
            try
            {
                await DeleteFolderAsync
                (
                    folder
                );

                success++;
            }

            catch
            {
                failed++;
            }
        }



        return new MenuSynchronizationResultDto
        {
            Success =
                failed == 0,


            Message =
                failed == 0

                ?

                "Menu backend rollback completed successfully."

                :

                "One or more folders could not be removed.",


            SynchronizedDate =
                DateTime.UtcNow,


            TotalOperations =
                folders.Count,


            SuccessfulOperations =
                success,


            FailedOperations =
                failed
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



        // Delete only empty folders
        if
        (
            Directory.GetFileSystemEntries
            (
                folderPath
            )
            .Length == 0
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