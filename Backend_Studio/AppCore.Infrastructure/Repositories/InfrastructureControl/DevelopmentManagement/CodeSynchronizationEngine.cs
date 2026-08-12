//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.Interfaces;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

using AppCore.Application.Platform.SubmenuFrontendSynchronizationEngine.Interfaces;
using AppCore.Application.Platform.SubmenuBackendSynchronizationEngine.Interfaces;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Entity Alias
//===============================================================

using CodeSynchronizationEntity =
    AppCore.Domain.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Code Synchronization Engine
//===============================================================

public class CodeSynchronizationEngine
    : ICodeSynchronizationEngine
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _context;


    private readonly ISubmenuFrontendSynchronizationEngine
        _frontendSynchronizationEngine;


    private readonly ISubmenuBackendSynchronizationEngine
        _backendSynchronizationEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationEngine
    (
        AppDbContext context,

        ISubmenuFrontendSynchronizationEngine
            frontendSynchronizationEngine,

        ISubmenuBackendSynchronizationEngine
            backendSynchronizationEngine
    )
    {
        _context =
            context;


        _frontendSynchronizationEngine =
            frontendSynchronizationEngine;


        _backendSynchronizationEngine =
            backendSynchronizationEngine;
    }



    //===========================================================
    // Synchronize
    //===========================================================

    public async Task<CodeSynchronizationEngineResult>
        SynchronizeAsync
    (
        long id
    )
    {
        //=======================================================
        // Load Code Synchronization
        //=======================================================

        var codeSynchronization =
            await LoadCodeSynchronizationAsync
            (
                id
            );


        //=======================================================
        // Validate
        //=======================================================

        var validationResult =
            await ValidateSynchronizationAsync
            (
                codeSynchronization
            );


        if
        (
            !validationResult.Success
        )
        {
            return validationResult;
        }


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var submenuSynchronization =
            await LoadSubmenuSynchronizationAsync
            (
                codeSynchronization.SubmenuSynchronizationId
            );


        //=======================================================
        // Execute
        //=======================================================

        var result =
            await ExecuteSynchronizationAsync
            (
                submenuSynchronization
            );


        //=======================================================
        // Failed
        //=======================================================

        if
        (
            !result.Success
        )
        {
            await UpdateFailedSynchronizationAsync
            (
                codeSynchronization,

                result.Message
            );


            return result;
        }


        //=======================================================
        // Update Status
        //=======================================================

        await UpdateSynchronizationStatusAsync
        (
            codeSynchronization,

            result.Message
        );


        //=======================================================
        // Result
        //=======================================================

        return new CodeSynchronizationEngineResult
        {
            Success =
                true,


            Message =
                result.Message
        };
    }



    //===========================================================
    // Rollback
    //===========================================================

    public async Task<CodeSynchronizationEngineResult>
        RollbackAsync
    (
        long id
    )
    {
        //=======================================================
        // Load Code Synchronization
        //=======================================================

        var codeSynchronization =
            await LoadCodeSynchronizationAsync
            (
                id
            );


        //=======================================================
        // Validate Rollback
        //=======================================================

        var validationResult =
            await ValidateRollbackAsync
            (
                codeSynchronization
            );


        if
        (
            !validationResult.Success
        )
        {
            return validationResult;
        }


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var submenuSynchronization =
            await LoadSubmenuSynchronizationAsync
            (
                codeSynchronization.SubmenuSynchronizationId
            );


        //=======================================================
        // Execute Rollback
        //=======================================================

        var result =
            await ExecuteRollbackAsync
            (
                submenuSynchronization
            );


        //=======================================================
        // Failed
        //=======================================================

        if
        (
            !result.Success
        )
        {
            return result;
        }


        //=======================================================
        // Update Status
        //=======================================================

        await UpdateRollbackStatusAsync
        (
            codeSynchronization
        );


        //=======================================================
        // Result
        //=======================================================

        return new CodeSynchronizationEngineResult
        {
            Success =
                true,


            Message =
                result.Message
        };
    }



    //===========================================================
    // Load Code Synchronization
    //===========================================================

    private async Task<CodeSynchronizationEntity>
        LoadCodeSynchronizationAsync
    (
        long id
    )
    {
        var synchronization =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                    x.Id ==
                    id

                    &&

                    !x.IsDeleted
                );


        if
        (
            synchronization == null
        )
        {
            throw new InvalidOperationException
            (
                "Code synchronization record was not found."
            );
        }


        return synchronization;
    }



    //===========================================================
    // Load Submenu Synchronization
    //===========================================================

    private async Task<SubmenuSynchronizationDto>
        LoadSubmenuSynchronizationAsync
    (
        long id
    )
    {
        var entity =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                    x.Id ==
                    id

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
                "The associated Submenu Synchronization record was not found."
            );
        }


        return BuildSubmenuSynchronizationDto
        (
            entity
        );
    }



    //===========================================================
    // Build Submenu Synchronization DTO
    //===========================================================

    private static SubmenuSynchronizationDto
        BuildSubmenuSynchronizationDto
    (
        AppCore.Domain.Entities.InfrastructureControl
            .DevelopmentManagement.SubmenuSynchronization entity
    )
    {
        return new SubmenuSynchronizationDto
        {
            //===================================================
            // Primary Key
            //===================================================

            Id =
                entity.Id,


            //===================================================
            // Module
            //===================================================

            ModuleId =
                entity.ModuleId,

            ModuleCode =
                entity.ModuleCode,

            ModuleName =
                entity.ModuleName,


            //===================================================
            // Menu
            //===================================================

            MenuId =
                entity.MenuId,

            MenuCode =
                entity.MenuCode,

            MenuName =
                entity.MenuName,


            //===================================================
            // Submenu
            //===================================================

            SubmenuId =
                entity.SubmenuId,

            SubmenuCode =
                entity.SubmenuCode,

            SubmenuName =
                entity.SubmenuName,


            //===================================================
            // Synchronization Type
            //===================================================

            SynchronizationType =
                entity.SynchronizationType,


            //===================================================
            // Frontend Target
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
            // Frontend Submenu
            //===================================================

            FrontendSubmenuFolder =
                entity.FrontendSubmenuFolder,

            FrontendFormFolder =
                entity.FrontendFormFolder,

            FrontendListFolder =
                entity.FrontendListFolder,


            //===================================================
            // Frontend Core Files
            //===================================================

            FrontendSubmenuModelFile =
                entity.FrontendSubmenuModelFile,

            FrontendSubmenuServiceFile =
                entity.FrontendSubmenuServiceFile,

            FrontendSubmenuRouteFile =
                entity.FrontendSubmenuRouteFile,


            //===================================================
            // Frontend Form Files
            //===================================================

            FrontendSubmenuFormTsFile =
                entity.FrontendSubmenuFormTsFile,

            FrontendSubmenuFormHtmlFile =
                entity.FrontendSubmenuFormHtmlFile,

            FrontendSubmenuFormCssFile =
                entity.FrontendSubmenuFormCssFile,


            //===================================================
            // Frontend List Files
            //===================================================

            FrontendSubmenuListTsFile =
                entity.FrontendSubmenuListTsFile,

            FrontendSubmenuListHtmlFile =
                entity.FrontendSubmenuListHtmlFile,

            FrontendSubmenuListCssFile =
                entity.FrontendSubmenuListCssFile,


            //===================================================
            // Backend Target
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
            // Synchronization Status
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

    private async Task<CodeSynchronizationEngineResult>
        ValidateSynchronizationAsync
    (
        CodeSynchronizationEntity synchronization
    )
    {
        //=======================================================
        // Validate Submenu Synchronization Reference
        //=======================================================

        if
        (
            synchronization.SubmenuSynchronizationId <= 0
        )
        {
            return new CodeSynchronizationEngineResult
            {
                Success =
                    false,


                Message =
                    "Code Synchronization does not have a valid Submenu Synchronization reference."
            };
        }


        //=======================================================
        // Validate Submenu Synchronization Status
        //=======================================================

        var submenuSynchronized =
            await _context.SubmenuSynchronizations

                .AsNoTracking()

                .AnyAsync
                (
                    x =>

                    x.Id ==
                    synchronization.SubmenuSynchronizationId

                    &&

                    x.Status ==
                    "Synchronized"

                    &&

                    !x.IsDeleted
                );


        if
        (
            !submenuSynchronized
        )
        {
            return new CodeSynchronizationEngineResult
            {
                Success =
                    false,


                Message =
                    "Code Synchronization cannot continue because the associated Submenu Synchronization has not been synchronized."
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
            return new CodeSynchronizationEngineResult
            {
                Success =
                    false,


                Message =
                    "Synchronization type is required."
            };
        }


        //=======================================================
        // Validate Supported Type
        //=======================================================

        if
        (
            !synchronization.SynchronizationType.Equals
            (
                "Frontend",
                StringComparison.OrdinalIgnoreCase
            )

            &&

            !synchronization.SynchronizationType.Equals
            (
                "Backend",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return new CodeSynchronizationEngineResult
            {
                Success =
                    false,


                Message =
                    $"Unsupported synchronization type '{synchronization.SynchronizationType}'."
            };
        }


        //=======================================================
        // Validation Passed
        //=======================================================

        return new CodeSynchronizationEngineResult
        {
            Success =
                true,


            Message =
                "Validation completed successfully."
        };
    }



    //===========================================================
    // Validate Rollback
    //===========================================================

    private async Task<CodeSynchronizationEngineResult>
        ValidateRollbackAsync
    (
        CodeSynchronizationEntity synchronization
    )
    {
        //=======================================================
        // Validate Reference
        //=======================================================

        if
        (
            synchronization.SubmenuSynchronizationId <= 0
        )
        {
            return new CodeSynchronizationEngineResult
            {
                Success =
                    false,


                Message =
                    "Code Synchronization does not have a valid Submenu Synchronization reference."
            };
        }


        //=======================================================
        // Validate Status
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
            return new CodeSynchronizationEngineResult
            {
                Success =
                    false,


                Message =
                    "Code Synchronization is not currently synchronized."
            };
        }


        //=======================================================
        // Validate Type
        //=======================================================

        if
        (
            !synchronization.SynchronizationType.Equals
            (
                "Frontend",
                StringComparison.OrdinalIgnoreCase
            )

            &&

            !synchronization.SynchronizationType.Equals
            (
                "Backend",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return new CodeSynchronizationEngineResult
            {
                Success =
                    false,


                Message =
                    $"Unsupported synchronization type '{synchronization.SynchronizationType}'."
            };
        }


        return new CodeSynchronizationEngineResult
        {
            Success =
                true,


            Message =
                "Rollback validation completed successfully."
        };
    }



    //===========================================================
    // Execute Synchronization
    //===========================================================

    private async Task<CodeSynchronizationEngineResult>
        ExecuteSynchronizationAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Frontend
        //=======================================================

        if
        (
            synchronization.SynchronizationType.Equals
            (
                "Frontend",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var result =
                await _frontendSynchronizationEngine
                    .SynchronizeAsync
                    (
                        synchronization
                    );


            return new CodeSynchronizationEngineResult
            {
                Success =
                    result.Success,


                Message =
                    result.Message
            };
        }


        //=======================================================
        // Backend
        //=======================================================

        if
        (
            synchronization.SynchronizationType.Equals
            (
                "Backend",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var result =
                await _backendSynchronizationEngine
                    .SynchronizeAsync
                    (
                        synchronization
                    );


            return new CodeSynchronizationEngineResult
            {
                Success =
                    result.Success,


                Message =
                    result.Message
            };
        }


        return new CodeSynchronizationEngineResult
        {
            Success =
                false,


            Message =
                $"Unsupported synchronization type '{synchronization.SynchronizationType}'."
        };
    }



    //===========================================================
    // Execute Rollback
    //===========================================================

    private async Task<CodeSynchronizationEngineResult>
        ExecuteRollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    )
    {
        //=======================================================
        // Frontend
        //=======================================================

        if
        (
            synchronization.SynchronizationType.Equals
            (
                "Frontend",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var result =
                await _frontendSynchronizationEngine
                    .RollbackAsync
                    (
                        synchronization
                    );


            return new CodeSynchronizationEngineResult
            {
                Success =
                    result.Success,


                Message =
                    result.Message
            };
        }


        //=======================================================
        // Backend
        //=======================================================

        if
        (
            synchronization.SynchronizationType.Equals
            (
                "Backend",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            var result =
                await _backendSynchronizationEngine
                    .RollbackAsync
                    (
                        synchronization
                    );


            return new CodeSynchronizationEngineResult
            {
                Success =
                    result.Success,


                Message =
                    result.Message
            };
        }


        return new CodeSynchronizationEngineResult
        {
            Success =
                false,


            Message =
                $"Unsupported synchronization type '{synchronization.SynchronizationType}'."
        };
    }



    //===========================================================
    // Update Synchronization Status
    //===========================================================

    private async Task UpdateSynchronizationStatusAsync
    (
        CodeSynchronizationEntity synchronization,

        string resultMessage
    )
    {
        var entity =
            await _context.CodeSynchronizations

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
                "Code synchronization record was not found."
            );
        }


        entity.Status =
            "Synchronized";


        entity.LastSynchronizedDate =
            DateTime.UtcNow;


        entity.LastSynchronizationResult =
            resultMessage;


        entity.LastSynchronizedBy =
            1;


        entity.ModifiedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            1;


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Update Failed Synchronization
    //===========================================================

    private async Task UpdateFailedSynchronizationAsync
    (
        CodeSynchronizationEntity synchronization,

        string resultMessage
    )
    {
        var entity =
            await _context.CodeSynchronizations

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
                "Code synchronization record was not found."
            );
        }


        entity.Status =
            "Failed";


        entity.LastSynchronizationResult =
            resultMessage;


        entity.ModifiedDate =
            DateTime.UtcNow;


        entity.ModifiedBy =
            1;


        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Update Rollback Status
    //===========================================================

    private async Task UpdateRollbackStatusAsync
    (
        CodeSynchronizationEntity synchronization
    )
    {
        var entity =
            await _context.CodeSynchronizations

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
                "Code synchronization record was not found."
            );
        }


        entity.Status =
            "Ready";


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