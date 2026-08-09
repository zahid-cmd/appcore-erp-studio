//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.Interfaces;

using AppCore.Application.Platform.SubmenuFrontendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.SubmenuBackendSynchronizationEngine.Interfaces;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization;


//===============================================================
// Submenu Synchronization Engine
//===============================================================

public class SubmenuSynchronizationEngine
    : ISubmenuSynchronizationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly ISubmenuFrontendSynchronizationEngine
        _frontendSynchronizationEngine;

    private readonly ISubmenuBackendSynchronizationEngine
        _backendSynchronizationEngine;


    //===========================================================
    // Constructor
    //===========================================================

    public SubmenuSynchronizationEngine
    (
        AppDbContext context,

        ISubmenuFrontendSynchronizationEngine frontendSynchronizationEngine,

        ISubmenuBackendSynchronizationEngine backendSynchronizationEngine
    )
    {
        _context = context;

        _frontendSynchronizationEngine =
            frontendSynchronizationEngine;

        _backendSynchronizationEngine =
            backendSynchronizationEngine;
    }


    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<SubmenuSynchronizationResultDto> SynchronizeAsync
    (
        long synchronizationId
    )
    {
        var synchronization =
            await LoadSynchronizationAsync
            (
                synchronizationId
            );

        var validationResult =
            await ValidateSynchronizationAsync
            (
                synchronization
            );

        if
        (
            !validationResult.Success
        )
        {
            return validationResult;
        }

        var result =
            await ExecuteSynchronizationAsync
            (
                synchronization
            );

        if
        (
            !result.Success
        )
        {
            return result;
        }

        await UpdateSynchronizationStatusAsync
        (
            synchronization,

            result
        );

        return new SubmenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Submenu synchronization completed successfully.",

            SynchronizedDate =
                DateTime.UtcNow,

            TotalOperations =
                result.TotalOperations,

            SuccessfulOperations =
                result.SuccessfulOperations,

            FailedOperations =
                result.FailedOperations
        };
    }


    //===========================================================
    // Execute Synchronization
    //===========================================================

    private async Task<SubmenuSynchronizationResultDto>
    ExecuteSynchronizationAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization.SynchronizationType
                .Equals
                (
                    "Frontend",
                    StringComparison.OrdinalIgnoreCase
                )
        )
        {
            return await _frontendSynchronizationEngine
                .SynchronizeAsync
                (
                    synchronization
                );
        }

        if
        (
            synchronization.SynchronizationType
                .Equals
                (
                    "Backend",
                    StringComparison.OrdinalIgnoreCase
                )
        )
        {
            return await _backendSynchronizationEngine
                .SynchronizeAsync
                (
                    synchronization
                );
        }

        return new SubmenuSynchronizationResultDto
        {
            Success = false,

            Message =
                $"Unsupported synchronization type '{synchronization.SynchronizationType}'."
        };
    }


    //===========================================================
    // Load Synchronization
    //===========================================================

    private async Task<SubmenuSynchronizationDto>
    LoadSynchronizationAsync
    (
        long synchronizationId
    )
    {
        var entity =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                    x.Id == synchronizationId

                    &&

                    !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new InvalidOperationException
            (
                "Submenu synchronization configuration was not found."
            );
        }

        return BuildSynchronizationDto
        (
            entity
        );
    }


    //===========================================================
    // Build Synchronization DTO
    //===========================================================

    private static SubmenuSynchronizationDto BuildSynchronizationDto
    (
        Domain.Entities.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization entity
    )
    {
        return new SubmenuSynchronizationDto
        {
            Id =
                entity.Id,

            ModuleId =
                entity.ModuleId,

            ModuleCode =
                entity.ModuleCode,

            ModuleName =
                entity.ModuleName,

            MenuId =
                entity.MenuId,

            MenuCode =
                entity.MenuCode,

            MenuName =
                entity.MenuName,

            SubmenuId =
                entity.SubmenuId,

            SubmenuCode =
                entity.SubmenuCode,

            SubmenuName =
                entity.SubmenuName,

            SynchronizationType =
                entity.SynchronizationType,


            //===================================================
            // Frontend Target Location
            //===================================================

            FrontendSolution =
                entity.FrontendSolution,

            FrontendProject =
                entity.FrontendProject,

            FrontendSourceFolder =
                entity.FrontendSourceFolder,

            FrontendFeatureFolder =
                entity.FrontendFeatureFolder,

            FrontendMenuFolder =
                entity.FrontendMenuFolder,


            //===================================================
            // Frontend Submenu Location
            //===================================================

            FrontendSubmenuFolder =
                entity.FrontendSubmenuFolder,

            FrontendPagesFolder =
                entity.FrontendPagesFolder,

            FrontendFormFolder =
                entity.FrontendFormFolder,

            FrontendListFolder =
                entity.FrontendListFolder,


            //===================================================
            // Frontend Submenu Core Files
            //===================================================

            FrontendSubmenuModelFile =
                entity.FrontendSubmenuModelFile,

            FrontendSubmenuServiceFile =
                entity.FrontendSubmenuServiceFile,

            FrontendSubmenuRouteFile =
                entity.FrontendSubmenuRouteFile,


            //===================================================
            // Frontend Submenu Page Files
            //===================================================

            FrontendSubmenuFormTsFile =
                entity.FrontendSubmenuFormTsFile,

            FrontendSubmenuFormHtmlFile =
                entity.FrontendSubmenuFormHtmlFile,

            FrontendSubmenuFormCssFile =
                entity.FrontendSubmenuFormCssFile,

            FrontendSubmenuListTsFile =
                entity.FrontendSubmenuListTsFile,

            FrontendSubmenuListHtmlFile =
                entity.FrontendSubmenuListHtmlFile,

            FrontendSubmenuListCssFile =
                entity.FrontendSubmenuListCssFile,


            //===================================================
            // Backend Target Location
            //===================================================

            BackendSolution =
                entity.BackendSolution,

            BackendApplicationProject =
                entity.BackendApplicationProject,

            BackendDomainProject =
                entity.BackendDomainProject,

            BackendInfrastructureProject =
                entity.BackendInfrastructureProject,


            //===================================================
            // Backend API
            //===================================================

            BackendControllerFile =
                entity.BackendControllerFile,


            //===================================================
            // Backend Application
            //===================================================

            BackendApplicationSubMenuFolder =
                entity.BackendApplicationSubMenuFolder,

            BackendApplicationDtosFolder =
                entity.BackendApplicationDtosFolder,

            BackendApplicationInterfacesFolder =
                entity.BackendApplicationInterfacesFolder,

            BackendSubMenuDtoFile =
                entity.BackendSubMenuDtoFile,

            BackendCreateSubMenuDtoFile =
                entity.BackendCreateSubMenuDtoFile,

            BackendUpdateSubMenuDtoFile =
                entity.BackendUpdateSubMenuDtoFile,

            BackendSubMenuDefaultsDtoFile =
                entity.BackendSubMenuDefaultsDtoFile,

            BackendSubMenuRepositoryInterfaceFile =
                entity.BackendSubMenuRepositoryInterfaceFile,


            //===================================================
            // Backend Domain
            //===================================================

            BackendSubMenuEntityFile =
                entity.BackendSubMenuEntityFile,


            //===================================================
            // Backend Infrastructure
            //===================================================

            BackendSubMenuConfigurationFile =
                entity.BackendSubMenuConfigurationFile,

            BackendSubMenuRepositoryFile =
                entity.BackendSubMenuRepositoryFile,


            //===================================================
            // Synchronization
            //===================================================

            Status =
                entity.Status,


            //===================================================
            // Configuration
            //===================================================

            Remarks =
                entity.Remarks,


            //===================================================
            // Last Synchronization
            //===================================================

            LastSynchronizedBy =
                entity.LastSynchronizedBy,

            LastSynchronizedDate =
                entity.LastSynchronizedDate,

            LastSynchronizationResult =
                entity.LastSynchronizationResult,


            //===================================================
            // Status
            //===================================================

            IsActive =
                entity.IsActive,


            //===================================================
            // Audit
            //===================================================

            CreatedDate =
                entity.CreatedDate
        };
    }


    //===========================================================
    // Validate Synchronization
    //===========================================================

    private async Task<SubmenuSynchronizationResultDto>
    ValidateSynchronizationAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Module
        //=======================================================

        if
        (
            synchronization.ModuleId <= 0
        )
        {
            return new SubmenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "Module is required."
            };
        }


        //=======================================================
        // Validate Menu
        //=======================================================

        if
        (
            synchronization.MenuId <= 0
        )
        {
            return new SubmenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "Menu is required."
            };
        }


        //=======================================================
        // Validate Submenu
        //=======================================================

        if
        (
            synchronization.SubmenuId <= 0
        )
        {
            return new SubmenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "Submenu is required."
            };
        }


        //=======================================================
        // Validate Synchronization Type
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.SynchronizationType
            )
        )
        {
            return new SubmenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "Synchronization type is required."
            };
        }


        //=======================================================
        // Validate Frontend
        //=======================================================

        if
        (
            synchronization.SynchronizationType
                .Equals
                (
                    "Frontend",
                    StringComparison.OrdinalIgnoreCase
                )
        )
        {
            if
            (
                string.IsNullOrWhiteSpace
                (
                    synchronization.FrontendSolution
                )
            )
            {
                return new SubmenuSynchronizationResultDto
                {
                    Success = false,

                    Message =
                        "Frontend solution is required."
                };
            }
        }


        //=======================================================
        // Validate Backend
        //=======================================================

        if
        (
            synchronization.SynchronizationType
                .Equals
                (
                    "Backend",
                    StringComparison.OrdinalIgnoreCase
                )
        )
        {
            //===================================================
            // Validate Backend Solution
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendSolution
                )
            )
            {
                return new SubmenuSynchronizationResultDto
                {
                    Success = false,

                    Message =
                        "Backend solution is required."
                };
            }


            //===================================================
            // Validate Backend Configuration
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendControllerFile
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendApplicationSubMenuFolder
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendSubMenuEntityFile
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendSubMenuRepositoryFile
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendSubMenuConfigurationFile
                )
            )
            {
                return new SubmenuSynchronizationResultDto
                {
                    Success = false,

                    Message =
                        "No backend configuration was provided."
                };
            }
        }


        //=======================================================
        // Validation Passed
        //=======================================================

        await Task.CompletedTask;

        return new SubmenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Validation completed successfully."
        };
    }


    //===========================================================
    // Update Synchronization Status
    //===========================================================

    private async Task UpdateSynchronizationStatusAsync
    (
        SubmenuSynchronizationDto synchronization,

        SubmenuSynchronizationResultDto result
    )
    {
        var entity =
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                    x.Id ==
                    synchronization.Id

                    &&

                    !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new InvalidOperationException
            (
                "Submenu synchronization configuration was not found."
            );
        }

        entity.Status =
            "Synchronized";

        entity.LastSynchronizedDate =
            DateTime.UtcNow;

        entity.LastSynchronizationResult =
            result.Message;

        entity.LastSynchronizedBy =
            1;

        entity.ModifiedDate =
            DateTime.UtcNow;

        entity.ModifiedBy =
            1;

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Rollback
    //===========================================================

    public async Task<SubmenuSynchronizationResultDto> RollbackAsync
    (
        long synchronizationId
    )
    {
        var synchronization =
            await LoadSynchronizationAsync
            (
                synchronizationId
            );

        var validationResult =
            await ValidateSynchronizationAsync
            (
                synchronization
            );

        if
        (
            !validationResult.Success
        )
        {
            return validationResult;
        }

        var result =
            await ExecuteRollbackAsync
            (
                synchronization
            );

        if
        (
            !result.Success
        )
        {
            return result;
        }

        await UpdateRollbackStatusAsync
        (
            synchronization
        );

        return new SubmenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Submenu rollback completed successfully.",

            SynchronizedDate =
                DateTime.UtcNow,

            TotalOperations =
                result.TotalOperations,

            SuccessfulOperations =
                result.SuccessfulOperations,

            FailedOperations =
                result.FailedOperations
        };
    }


    //===========================================================
    // Execute Rollback
    //===========================================================

    private async Task<SubmenuSynchronizationResultDto>
    ExecuteRollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization.SynchronizationType
                .Equals
                (
                    "Frontend",
                    StringComparison.OrdinalIgnoreCase
                )
        )
        {
            return await _frontendSynchronizationEngine
                .RollbackAsync
                (
                    synchronization
                );
        }

        if
        (
            synchronization.SynchronizationType
                .Equals
                (
                    "Backend",
                    StringComparison.OrdinalIgnoreCase
                )
        )
        {
            return await _backendSynchronizationEngine
                .RollbackAsync
                (
                    synchronization
                );
        }

        return new SubmenuSynchronizationResultDto
        {
            Success = false,

            Message =
                $"Unsupported synchronization type '{synchronization.SynchronizationType}'."
        };
    }


    //===========================================================
    // Update Rollback Status
    //===========================================================

    private async Task UpdateRollbackStatusAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        var entity =
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                    x.Id ==
                    synchronization.Id

                    &&

                    !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new InvalidOperationException
            (
                "Submenu synchronization configuration was not found."
            );
        }

        entity.Status =
            "Pending";

        entity.LastSynchronizedDate =
            null;

        entity.LastSynchronizationResult =
            "Rollback completed successfully.";

        entity.ModifiedDate =
            DateTime.UtcNow;

        entity.ModifiedBy =
            1;

        await _context.SaveChangesAsync();
    }

}