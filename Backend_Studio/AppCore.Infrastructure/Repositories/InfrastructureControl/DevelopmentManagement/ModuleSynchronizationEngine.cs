//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.BackendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.FrontendSynchronizationEngine.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.Interfaces;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Module Synchronization Engine
//===============================================================

public class ModuleSynchronizationEngine
    : IModuleSynchronizationEngine
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IBackendSynchronizationEngine
        _backendSynchronizationEngine;

    private readonly IFrontendSynchronizationEngine
        _frontendSynchronizationEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public ModuleSynchronizationEngine
    (
        AppDbContext context,

        IBackendSynchronizationEngine backendSynchronizationEngine,

        IFrontendSynchronizationEngine frontendSynchronizationEngine
    )
    {
        _context =
            context;

        _backendSynchronizationEngine =
            backendSynchronizationEngine;

        _frontendSynchronizationEngine =
            frontendSynchronizationEngine;
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> SynchronizeAsync
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
            synchronization
        );


        return new ModuleSynchronizationResultDto
        {
            Success =
                true,

            Message =
                "Module synchronization completed successfully."
        };
    }



    //===========================================================
    // Execute Synchronization
    //===========================================================

    private async Task<ModuleSynchronizationResultDto>
    ExecuteSynchronizationAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization.SynchronizationType ==
            "Frontend"
        )
        {
            return await _frontendSynchronizationEngine
                .SynchronizeAsync
                (
                    synchronization
                );
        }


        return await _backendSynchronizationEngine
            .SynchronizeAsync
            (
                synchronization
            );
    }



    //===========================================================
    // Load Synchronization
    //===========================================================

    private async Task<ModuleSynchronizationDto>
    LoadSynchronizationAsync
    (
        long synchronizationId
    )
    {
        var entity =
            await _context.ModuleSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id ==
                        synchronizationId
                );


        if
        (
            entity == null
        )
        {
            throw new InvalidOperationException
            (
                "Module synchronization configuration was not found."
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

    private static ModuleSynchronizationDto BuildSynchronizationDto
    (
        Domain.Entities.InfrastructureControl.DevelopmentManagement.ModuleSynchronization entity
    )
    {
        return new ModuleSynchronizationDto
        {
            Id =
                entity.Id,

            ModuleId =
                entity.ModuleId,

            ModuleCode =
                entity.ModuleCode,

            ModuleName =
                entity.ModuleName,

            SynchronizationType =
                entity.SynchronizationType,

            FrontendSolution =
                entity.FrontendSolution,

            FrontendProject =
                entity.FrontendProject,

            FrontendSourceFolder =
                entity.FrontendSourceFolder,

            FrontendFeatureFolder =
                entity.FrontendFeatureFolder,

            FrontendModuleFolder =
                entity.FrontendModuleFolder,

            FrontendRoutesFolder =
                entity.FrontendRoutesFolder,

            FrontendModuleRouteFile =
                entity.FrontendModuleRouteFile,

            FrontendApplicationRouteFile =
                entity.FrontendApplicationRouteFile,

            BackendSolution =
                entity.BackendSolution,

            BackendApiProject =
                entity.BackendApiProject,

            BackendApplicationProject =
                entity.BackendApplicationProject,

            BackendDomainProject =
                entity.BackendDomainProject,

            BackendInfrastructureProject =
                entity.BackendInfrastructureProject,

            BackendControllerFolder =
                entity.BackendControllerFolder,

            BackendApplicationFolder =
                entity.BackendApplicationFolder,

            BackendInterfaceFolder =
                entity.BackendInterfaceFolder,

            BackendEntityFolder =
                entity.BackendEntityFolder,

            BackendRepositoryFolder =
                entity.BackendRepositoryFolder,

            BackendConfigurationFolder =
                entity.BackendConfigurationFolder,

            DependencyInjectionFile =
                entity.DependencyInjectionFile,

            DbContextFile =
                entity.DbContextFile,

            Status =
                entity.Status,

            Remarks =
                entity.Remarks,

            LastSynchronizedBy =
                entity.LastSynchronizedBy,

            LastSynchronizedDate =
                entity.LastSynchronizedDate,

            LastSynchronizationResult =
                entity.LastSynchronizationResult,

            IsActive =
                entity.IsActive,

            CreatedDate =
                entity.CreatedDate
        };
    }



    //===========================================================
    // Validate Synchronization
    //===========================================================

    private async Task<ModuleSynchronizationResultDto>
    ValidateSynchronizationAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization.ModuleId <= 0
        )
        {
            return new ModuleSynchronizationResultDto
            {
                Success =
                    false,

                Message =
                    "Module is required."
            };
        }


        if
        (
            string.IsNullOrWhiteSpace
            (
                synchronization.SynchronizationType
            )
        )
        {
            return new ModuleSynchronizationResultDto
            {
                Success =
                    false,

                Message =
                    "Synchronization type is required."
            };
        }


        if
        (
            synchronization.SynchronizationType ==
            "Frontend"
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
                return new ModuleSynchronizationResultDto
                {
                    Success =
                        false,

                    Message =
                        "Frontend solution is required."
                };
            }
        }


        if
        (
            synchronization.SynchronizationType ==
            "Backend"
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
                return new ModuleSynchronizationResultDto
                {
                    Success =
                        false,

                    Message =
                        "Backend solution is required."
                };
            }
        }


        await Task.CompletedTask;


        return new ModuleSynchronizationResultDto
        {
            Success =
                true,

            Message =
                "Validation completed successfully."
        };
    }



    //===========================================================
    // Update Synchronization Status
    //===========================================================

    private async Task UpdateSynchronizationStatusAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        var entity =
            await _context.ModuleSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id ==
                        synchronization.Id
                );


        if
        (
            entity == null
        )
        {
            throw new InvalidOperationException
            (
                "Module synchronization configuration was not found."
            );
        }


        entity.Status =
            "Synchronized";


        entity.LastSynchronizedDate =
            DateTime.UtcNow;


        entity.LastSynchronizationResult =
            "Synchronization completed successfully.";


        entity.LastSynchronizedBy =
            1;


        entity.ModifiedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            1;


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Rollback Validation
    //===========================================================
    //
    // This method validates whether the Module Synchronization
    // itself can be rolled back.
    //
    // Navigation master data does NOT block rollback.
    //
    // Menu Synchronizations DO block rollback only when the
    // dependent Menu Synchronization has successfully completed
    // synchronization.
    //
    // A saved / Pending Menu Synchronization does NOT block
    // Module rollback.
    //
    // Frontend Module Synchronization is checked only against
    // Frontend Menu Synchronization.
    //
    // Backend Module Synchronization is checked only against
    // Backend Menu Synchronization.
    //
    //===========================================================

    public async Task<ModuleSynchronizationRollbackValidationDto?>
        ValidateRollbackAsync
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
            return new ModuleSynchronizationRollbackValidationDto
            {
                CanRollback =
                    false,

                Message =
                    validationResult.Message
            };
        }


        //=======================================================
        // Validate Dependent Menu Synchronizations
        //=======================================================
        //
        // Only a successfully synchronized Menu belonging to
        // the same Module AND the same Synchronization Type
        // blocks Module rollback.
        //
        // Pending / saved Menu configuration does NOT block.
        //
        // Deleted Menu Synchronization does NOT block.
        //
        //=======================================================

        var hasDependentMenuSynchronizations =
            await _context.MenuSynchronizations

                .AnyAsync
                (
                    x =>
                        x.ModuleId ==
                        synchronization.ModuleId

                        &&

                        x.SynchronizationType ==
                        synchronization.SynchronizationType

                        &&

                        !x.IsDeleted

                        &&

                        x.Status ==
                        "Synchronized"
                );


        if
        (
            hasDependentMenuSynchronizations
        )
        {
            return new ModuleSynchronizationRollbackValidationDto
            {
                CanRollback =
                    false,

                Message =
                    $"Module Rollback Blocked ! Menu Synchronization Found under this module !"
            };
        }


        //=======================================================
        // Rollback Allowed
        //=======================================================

        return new ModuleSynchronizationRollbackValidationDto
        {
            CanRollback =
                true,

            Message =
                "Module rollback validation completed successfully."
        };
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> RollbackAsync
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


        //=======================================================
        // Validate Dependent Menu Synchronizations
        //=======================================================
        //
        // This is the authoritative server-side protection.
        //
        // Even if the frontend bypasses validation or the
        // confirmation dialog, the Module rollback cannot
        // continue while a dependent successfully synchronized
        // Menu exists.
        //
        // Pending / saved Menu configuration does NOT block.
        //
        //=======================================================

        var rollbackValidation =
            await ValidateRollbackAsync
            (
                synchronizationId
            );


        if
        (
            rollbackValidation == null
            ||
            !rollbackValidation.CanRollback
        )
        {
            return new ModuleSynchronizationResultDto
            {
                Success =
                    false,

                Message =
                    rollbackValidation?.Message
                    ??
                    "Module rollback is blocked because dependent Menu Synchronization data exists."
            };
        }


        //=======================================================
        // Execute Rollback
        //=======================================================

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


        //=======================================================
        // Update Rollback Status
        //=======================================================

        await UpdateRollbackStatusAsync
        (
            synchronization
        );


        return new ModuleSynchronizationResultDto
        {
            Success =
                true,

            Message =
                "Module rollback completed successfully."
        };
    }



    //===========================================================
    // Execute Rollback
    //===========================================================

    private async Task<ModuleSynchronizationResultDto>
    ExecuteRollbackAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        if
        (
            synchronization.SynchronizationType ==
            "Frontend"
        )
        {
            return await _frontendSynchronizationEngine
                .RollbackAsync
                (
                    synchronization
                );
        }


        return await _backendSynchronizationEngine
            .RollbackAsync
            (
                synchronization
            );
    }



    //===========================================================
    // Update Rollback Status
    //===========================================================

    private async Task UpdateRollbackStatusAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        var entity =
            await _context.ModuleSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id ==
                        synchronization.Id
                );


        if
        (
            entity == null
        )
        {
            throw new InvalidOperationException
            (
                "Module synchronization configuration was not found."
            );
        }


        entity.Status =
            "Pending";


        entity.LastSynchronizationResult =
            "Rollback completed successfully.";


        entity.ModifiedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            1;


        await _context.SaveChangesAsync();
    }
}