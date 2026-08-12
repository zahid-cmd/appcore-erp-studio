//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.Interfaces;

using AppCore.Application.Platform.MenuFrontendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.MenuBackendSynchronizationEngine.Interfaces;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.MenuSynchronization;


//===============================================================
// Menu Synchronization Engine
//===============================================================

public class MenuSynchronizationEngine
    : IMenuSynchronizationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IMenuFrontendSynchronizationEngine
        _frontendSynchronizationEngine;

    private readonly IMenuBackendSynchronizationEngine
        _backendSynchronizationEngine;


    //===========================================================
    // Constructor
    //===========================================================

    public MenuSynchronizationEngine
    (
        AppDbContext context,

        IMenuFrontendSynchronizationEngine frontendSynchronizationEngine,

        IMenuBackendSynchronizationEngine backendSynchronizationEngine
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

    public async Task<MenuSynchronizationResultDto> SynchronizeAsync
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


        return new MenuSynchronizationResultDto
        {
            Success = true,

            Message =
                "Menu synchronization completed successfully.",

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

    private async Task<MenuSynchronizationResultDto>
    ExecuteSynchronizationAsync
    (
        MenuSynchronizationDto synchronization
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


        return new MenuSynchronizationResultDto
        {
            Success = false,

            Message =
                $"Unsupported synchronization type '{synchronization.SynchronizationType}'."
        };
    }



    //===========================================================
    // Load Synchronization
    //===========================================================

    private async Task<MenuSynchronizationDto>
    LoadSynchronizationAsync
    (
        long synchronizationId
    )
    {
        var entity =
            await _context.MenuSynchronizations

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
                "Menu synchronization configuration was not found."
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

    private static MenuSynchronizationDto BuildSynchronizationDto
    (
        Domain.Entities.InfrastructureControl.DevelopmentManagement.MenuSynchronization entity
    )
    {
        return new MenuSynchronizationDto
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


            FrontendMenuFolder =
                entity.FrontendMenuFolder,

            FrontendModelsFolder =
                entity.FrontendModelsFolder,

            FrontendServicesFolder =
                entity.FrontendServicesFolder,

            FrontendPagesFolder =
                entity.FrontendPagesFolder,

            FrontendRoutesFolder =
                entity.FrontendRoutesFolder,


            FrontendMenuRouteFile =
                entity.FrontendMenuRouteFile,

            FrontendModuleRouteFile =
                entity.FrontendModuleRouteFile,

            FrontendApplicationRouteFile =
                entity.FrontendApplicationRouteFile,


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
            // Backend Menu Structure
            //===================================================

            BackendControllerFolder =
                entity.BackendControllerFolder,

            BackendApplicationFolder =
                entity.BackendApplicationFolder,

            BackendDomainFolder =
                entity.BackendDomainFolder,

            BackendConfigurationFolder =
                entity.BackendConfigurationFolder,

            BackendRepositoryFolder =
                entity.BackendRepositoryFolder,


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

    private async Task<MenuSynchronizationResultDto>
    ValidateSynchronizationAsync
    (
        MenuSynchronizationDto synchronization
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
            return new MenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "Module is required."
            };
        }



        //=======================================================
        // Validate Parent Module Synchronization
        //=======================================================
        //
        // A Menu Synchronization belongs to a Module
        // Synchronization.
        //
        // The parent Module Synchronization must already be
        // successfully synchronized before Menu Synchronization
        // is allowed.
        //
        // This checks the synchronization type as well so that
        // Frontend Menu Synchronization depends on the
        // Frontend Module Synchronization and Backend Menu
        // Synchronization depends on the Backend Module
        // Synchronization.
        //
        //=======================================================

        var parentModuleSynchronized =
            await _context.ModuleSynchronizations

                .AnyAsync
                (
                    x =>

                        x.ModuleId ==
                        synchronization.ModuleId

                        &&

                        !x.IsDeleted

                        &&

                        x.SynchronizationType ==
                        synchronization.SynchronizationType

                        &&

                        x.Status ==
                        "Synchronized"
                );


        if
        (
            !parentModuleSynchronized
        )
        {
            return new MenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    $"Menu synchronization is blocked. Parent Module '{synchronization.ModuleName}' has not been successfully synchronized yet. Please synchronize the parent Module before synchronizing this Menu."
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
            return new MenuSynchronizationResultDto
            {
                Success = false,

                Message =
                    "Menu is required."
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
            return new MenuSynchronizationResultDto
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
                return new MenuSynchronizationResultDto
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
                return new MenuSynchronizationResultDto
                {
                    Success = false,

                    Message =
                        "Backend solution is required."
                };
            }



            //===================================================
            // Validate Backend Folder Configuration
            //===================================================

            if
            (
                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendControllerFolder
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendApplicationFolder
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendDomainFolder
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendRepositoryFolder
                )

                &&

                string.IsNullOrWhiteSpace
                (
                    synchronization.BackendConfigurationFolder
                )
            )
            {
                return new MenuSynchronizationResultDto
                {
                    Success = false,

                    Message =
                        "No backend folder configuration was provided."
                };
            }
        }



        //=======================================================
        // Validation Passed
        //=======================================================

        await Task.CompletedTask;


        return new MenuSynchronizationResultDto
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
        MenuSynchronizationDto synchronization,

        MenuSynchronizationResultDto result
    )
    {
        var entity =
            await _context.MenuSynchronizations

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
                "Menu synchronization configuration was not found."
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

    public async Task<MenuSynchronizationResultDto> RollbackAsync
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


        if
        (
            !validationResult.Success
        )
        {
            return validationResult;
        }


        //=======================================================
        // Validate Rollback Status
        //=======================================================
        //
        // Rollback is allowed only when this Menu Synchronization
        // has already been successfully synchronized.
        //
        //=======================================================

        if
        (
            !synchronization.Status.Equals
            (
                "Synchronized",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return new MenuSynchronizationResultDto
            {
                Success =
                    false,

                Message =
                    $"Menu rollback is blocked because '{synchronization.MenuName}' has not been successfully synchronized."
            };
        }


        //=======================================================
        // Validate Dependent Submenu Synchronizations
        //=======================================================
        //
        // A Menu cannot be rolled back while a dependent Submenu
        // Synchronization has already been successfully
        // synchronized.
        //
        // NavigationSubmenus are master data and must NOT block
        // Menu Synchronization rollback.
        //
        //=======================================================

        var hasDependentSubmenuSynchronizations =
            await _context.SubmenuSynchronizations

                .AnyAsync
                (
                    x =>

                        x.MenuId ==
                        synchronization.MenuId

                        &&

                        !x.IsDeleted

                        &&

                        x.Status ==
                        "Synchronized"
                );


        if
        (
            hasDependentSubmenuSynchronizations
        )
        {
            return new MenuSynchronizationResultDto
            {
                Success =
                    false,

            Message =
                $"Menu Rollback Blocked ! Submenu Synchronization Found under this menu !"
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


        //=======================================================
        // Validate Rollback Result
        //=======================================================

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



        //=======================================================
        // Completed
        //=======================================================

        return new MenuSynchronizationResultDto
        {
            Success =
                true,

            Message =
                "Menu rollback completed successfully.",

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

    private async Task<MenuSynchronizationResultDto>
    ExecuteRollbackAsync
    (
        MenuSynchronizationDto synchronization
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



        return new MenuSynchronizationResultDto
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
        MenuSynchronizationDto synchronization
    )
    {

        var entity =
            await _context.MenuSynchronizations

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
                "Menu synchronization configuration was not found."
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