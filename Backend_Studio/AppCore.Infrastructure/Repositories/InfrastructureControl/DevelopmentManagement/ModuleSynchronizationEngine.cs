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
    private readonly IBackendSynchronizationEngine _backendSynchronizationEngine;
    private readonly IFrontendSynchronizationEngine _frontendSynchronizationEngine;

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
        //=======================================================
        // Load Synchronization
        //=======================================================

        var synchronization =
            await LoadSynchronizationAsync
            (
                synchronizationId
            );

        //=======================================================
        // Validate Synchronization
        //=======================================================

        var validationResult =
            await ValidateSynchronizationAsync
            (
                synchronization
            );

        if (!validationResult.Success)
        {
            return validationResult;
        }

        //=======================================================
        // Execute Synchronization
        //=======================================================

        var result =
            await ExecuteSynchronizationAsync
            (
                synchronization
            );

        //=======================================================
        // Synchronization Failed
        //=======================================================

        if (!result.Success)
        {
            return result;
        }

        //=======================================================
        // Update Synchronization Status
        //=======================================================

        await UpdateSynchronizationStatusAsync
        (
            synchronization
        );

        //=======================================================
        // Completed
        //=======================================================

        return new ModuleSynchronizationResultDto
        {
            Success = true,

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
            return
                await _frontendSynchronizationEngine
                    .SynchronizeAsync
                    (
                        synchronization
                    );
        }

        return
            await _backendSynchronizationEngine
                .SynchronizeAsync
                (
                    synchronization
                );
    }

    //===========================================================
    // Load Synchronization
    //===========================================================

    private async Task<ModuleSynchronizationDto> LoadSynchronizationAsync
    (
        long synchronizationId
    )
    {
        //=======================================================
        // Load Entity
        //=======================================================

        var entity =
            await _context.ModuleSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x => x.Id == synchronizationId
                );

        //=======================================================
        // Validate
        //=======================================================

        if (entity == null)
        {
            throw new InvalidOperationException
            (
                "Module synchronization configuration was not found."
            );
        }

        //=======================================================
        // Build DTO
        //=======================================================

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
            //===================================================
            // Primary Key
            //===================================================

            Id =
                entity.Id,

            //===================================================
            // Navigation
            //===================================================

            ModuleId =
                entity.ModuleId,

            ModuleCode =
                entity.ModuleCode,

            ModuleName =
                entity.ModuleName,

            //===================================================
            // Synchronization Type
            //===================================================

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

            //===================================================
            // Frontend Standard Module Structure
            //===================================================

            FrontendModuleFolder =
                entity.FrontendModuleFolder,

            FrontendModelFolder =
                entity.FrontendModelFolder,

            FrontendPagesFolder =
                entity.FrontendPagesFolder,

            FrontendRoutesFolder =
                entity.FrontendRoutesFolder,

            FrontendServicesFolder =
                entity.FrontendServicesFolder,

            FrontendModuleRouteFile =
                entity.FrontendModuleRouteFile,

            //===================================================
            // Frontend Application Registration
            //===================================================

            FrontendApplicationRouteFile =
                entity.FrontendApplicationRouteFile,

            FrontendRoutePath =
                entity.FrontendRoutePath,

            //===================================================
            // Backend Target Location
            //===================================================

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

            //===================================================
            // Backend Standard Module Structure
            //===================================================

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

            //===================================================
            // Backend Application Registration
            //===================================================

            DependencyInjectionFile =
                entity.DependencyInjectionFile,

            DbContextFile =
                entity.DbContextFile,

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

    private async Task<ModuleSynchronizationResultDto> ValidateSynchronizationAsync
    (
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Validate Module
        //=======================================================

        if (synchronization.ModuleId <= 0)
        {
            return new ModuleSynchronizationResultDto
            {
                Success = false,

                Message =
                    "Module is required."
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
            return new ModuleSynchronizationResultDto
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
                    Success = false,

                    Message =
                        "Backend solution is required."
                };
            }
        }

        //=======================================================
        // Validation Passed
        //=======================================================

        await Task.CompletedTask;

        return new ModuleSynchronizationResultDto
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
        ModuleSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Load Entity
        //=======================================================

        var entity =
            await _context.ModuleSynchronizations

                .FirstOrDefaultAsync
                (
                    x => x.Id == synchronization.Id
                );

        //=======================================================
        // Validate
        //=======================================================

        if (entity == null)
        {
            throw new InvalidOperationException
            (
                "Module synchronization configuration was not found."
            );
        }

        //=======================================================
        // Synchronization
        //=======================================================

        entity.Status =
            "Synchronized";

        entity.LastSynchronizedDate =
            DateTime.UtcNow;

        entity.LastSynchronizationResult =
            "Synchronization completed successfully.";

        entity.LastSynchronizedBy =
            1;

        //=======================================================
        // Audit
        //=======================================================

        entity.ModifiedDate =
            DateTime.UtcNow;

        entity.ModifiedBy =
            1;

        //=======================================================
        // Save
        //=======================================================

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Rollback
    //===========================================================

    public async Task<ModuleSynchronizationResultDto> RollbackAsync
    (
        long synchronizationId
    )
    {
        //=======================================================
        // Load Synchronization
        //=======================================================

        var synchronization =
            await LoadSynchronizationAsync
            (
                synchronizationId
            );

        //=======================================================
        // Validate Synchronization
        //=======================================================

        var validationResult =
            await ValidateSynchronizationAsync
            (
                synchronization
            );

        if (!validationResult.Success)
        {
            return validationResult;
        }

        //=======================================================
        // Execute Rollback
        //=======================================================

        var result =
            await ExecuteRollbackAsync
            (
                synchronization
            );

        //=======================================================
        // Rollback Failed
        //=======================================================

        if (!result.Success)
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

        //=======================================================
        // Completed
        //=======================================================

        return new ModuleSynchronizationResultDto
        {
            Success = true,

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
            return
                await _frontendSynchronizationEngine
                    .RollbackAsync
                    (
                        synchronization
                    );
        }

        return
            await _backendSynchronizationEngine
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
        //=======================================================
        // Load Entity
        //=======================================================

        var entity =
            await _context.ModuleSynchronizations

                .FirstOrDefaultAsync
                (
                    x => x.Id == synchronization.Id
                );

        //=======================================================
        // Validate
        //=======================================================

        if (entity == null)
        {
            throw new InvalidOperationException
            (
                "Module synchronization configuration was not found."
            );
        }

        //=======================================================
        // Rollback
        //=======================================================

        entity.Status =
            "Pending";

        entity.LastSynchronizationResult =
            "Rollback completed successfully.";

        entity.ModifiedDate =
            DateTime.UtcNow;

        entity.ModifiedBy =
            1;

        //=======================================================
        // Save
        //=======================================================

        await _context.SaveChangesAsync();
    }
}