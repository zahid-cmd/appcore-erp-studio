//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendRegistrationEngine;
using AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendDatabaseEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Code Synchronization Controller
//===============================================================

[ApiController]

[Route(
    "api/infrastructure-control/development-management/code-synchronization"
)]

public class CodeSynchronizationController
    : ControllerBase
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly ICodeSynchronizationRepository
        _repository;


    private readonly IActivityHistoryRepository
        _activityHistoryRepository;


    private readonly IBackendRegistrationEngine
        _backendRegistrationEngine;


    private readonly IBackendDatabaseEngine
        _backendDatabaseEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationController
    (
        ICodeSynchronizationRepository repository,

        IActivityHistoryRepository activityHistoryRepository,

        IBackendRegistrationEngine backendRegistrationEngine,

        IBackendDatabaseEngine backendDatabaseEngine
    )
    {
        _repository =
            repository;


        _activityHistoryRepository =
            activityHistoryRepository;


        _backendRegistrationEngine =
            backendRegistrationEngine;


        _backendDatabaseEngine =
            backendDatabaseEngine;
    }



    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<CodeSynchronizationDto>>>
        GetAll
    (
        [FromQuery] string type
    )
    {
        return Ok
        (
            await _repository.GetAllAsync
            (
                type
            )
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<CodeSynchronizationDto>>
        GetById
    (
        long id
    )
    {
        var synchronization =
            await _repository.GetByIdAsync
            (
                id
            );


        if
        (
            synchronization == null
        )
        {
            return NotFound();
        }


        return Ok
        (
            synchronization
        );
    }



    //===========================================================
    // Get Generated Files
    //===========================================================

    [HttpGet("{id:long}/files")]

    public async Task<ActionResult<List<CodeSynchronizationFileDto>>>
        GetFiles
    (
        long id
    )
    {
        return Ok
        (
            await _repository.GetFilesAsync
            (
                id
            )
        );
    }



    //===========================================================
    // Restore File
    //===========================================================

    [HttpPost("{id:long}/restore")]

    public async Task<ActionResult>
        RestoreFile
    (
        long id,

        [FromQuery] string fileName
    )
    {
        try
        {
            var restored =
                await _repository.RestoreFileAsync
                (
                    id,

                    fileName
                );


            if
            (
                !restored
            )
            {
                return NotFound();
            }


            return NoContent();
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Restore All Modified Files
    //===========================================================

    [HttpPost("{id:long}/restore-all")]

    public async Task<ActionResult>
        RestoreAllFiles
    (
        long id
    )
    {
        try
        {
            var restored =
                await _repository.RestoreAllFilesAsync
                (
                    id
                );


            if
            (
                !restored
            )
            {
                return NotFound();
            }


            return NoContent();
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Synchronize
    //===========================================================

    [HttpPost("{id:long}/sync")]

    public async Task<ActionResult>
        Sync
    (
        long id
    )
    {
        try
        {
            var synchronized =
                await _repository.SynchronizeAsync
                (
                    id
                );


            if
            (
                !synchronized
            )
            {
                return NotFound();
            }


            return NoContent();
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Backend Database Registration
    //===========================================================
    //
    // Registration is responsible only for generated backend
    // code registration:
    //
    //     - AppDbContext DbSet registration
    //     - Dependency Injection registration
    //
    // It does NOT create the physical database table.
    //
    //===========================================================

    [HttpPost("{id:long}/register")]

    public async Task<ActionResult>
        Register
    (
        long id
    )
    {
        try
        {
            //===================================================
            // Load Code Synchronization
            //===================================================

            var synchronization =
                await _repository.GetByIdAsync
                (
                    id
                );


            if
            (
                synchronization == null
            )
            {
                return NotFound();
            }


            //===================================================
            // Validate Synchronization Type
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.SynchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend registration is available only for Backend Code Synchronization."
                );
            }


            //===================================================
            // Validate Code Synchronization State
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.Status,

                    "Synchronized",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend registration is available only after Code Synchronization has completed successfully."
                );
            }


            //===================================================
            // Prevent Duplicate Registration
            //===================================================

            if
            (
                string.Equals
                (
                    synchronization.DbStatus,

                    "Registered",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "The backend code is already registered."
                );
            }


            //===================================================
            // Load Submenu Synchronization
            //===================================================

            var submenuSynchronization =
                await _repository
                    .GetSubmenuSynchronizationForRegistrationAsync
                    (
                        id
                    );


            if
            (
                submenuSynchronization == null
            )
            {
                return NotFound();
            }


            //===================================================
            // Execute Backend Registration
            //===================================================

            var result =
                await _backendRegistrationEngine
                    .RegisterAsync
                    (
                        submenuSynchronization
                    );


            //===================================================
            // Registration Failed
            //===================================================

            if
            (
                !result.Success
            )
            {
                await _repository
                    .UpdateBackendRegistrationStatusAsync
                    (
                        id,

                        false,

                        result.Message
                    );


                return BadRequest
                (
                    result.Message
                );
            }


            //===================================================
            // Registration Successful
            //===================================================

            await _repository
                .UpdateBackendRegistrationStatusAsync
                (
                    id,

                    true,

                    result.Message
                );


            return NoContent();
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            await _repository
                .UpdateBackendRegistrationStatusAsync
                (
                    id,

                    false,

                    exception.Message
                );


            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Backend Database Deregistration
    //===========================================================
    //
    // This removes the generated backend code registration from:
    //
    //     - AppDbContext
    //     - Dependency Injection
    //
    // It does NOT remove the physical database table.
    //
    // Physical database structure is controlled separately by
    // Backend Database Engine.
    //
    //===========================================================

    [HttpPost("{id:long}/register/rollback")]

    public async Task<ActionResult>
        RollbackRegistration
    (
        long id
    )
    {
        try
        {
            //===================================================
            // Load Code Synchronization
            //===================================================

            var synchronization =
                await _repository.GetByIdAsync
                (
                    id
                );


            if
            (
                synchronization == null
            )
            {
                return NotFound();
            }


            //===================================================
            // Validate Synchronization Type
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.SynchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend deregistration is available only for Backend Code Synchronization."
                );
            }


            //===================================================
            // Validate Code Synchronization State
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.Status,

                    "Synchronized",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend deregistration is available only while Code Synchronization is synchronized."
                );
            }


            //===================================================
            // Validate Registration State
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.DbStatus,

                    "Registered",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "The backend code is not currently registered."
                );
            }


            //===================================================
            // Load Submenu Synchronization
            //===================================================

            var submenuSynchronization =
                await _repository
                    .GetSubmenuSynchronizationForRegistrationAsync
                    (
                        id
                    );


            if
            (
                submenuSynchronization == null
            )
            {
                return NotFound();
            }


            //===================================================
            // Execute Backend Deregistration
            //===================================================

            var result =
                await _backendRegistrationEngine
                    .RollbackAsync
                    (
                        submenuSynchronization
                    );


            //===================================================
            // Deregistration Failed
            //===================================================

            if
            (
                !result.Success
            )
            {
                return BadRequest
                (
                    result.Message
                );
            }


            //===================================================
            // Deregistration Successful
            //===================================================
            //
            // DbStatus:
            //
            //     Registered -> Pending
            //
            // Code remains synchronized.
            //
            // Physical database table is NOT removed here.
            //
            //===================================================

            await _repository
                .UpdateBackendDeregistrationStatusAsync
                (
                    id,

                    result.Message
                );


            return NoContent();
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Backend Database Create
    //===========================================================
    //
    // Creates the physical database structure using the
    // Backend Database Engine.
    //
    // This is independent from Backend Registration.
    //
    // Required state:
    //
    //     SynchronizationType = Backend
    //     Status = Synchronized
    //
    // The Backend Registration Engine must already have
    // registered the generated DbContext/entity code before the
    // migration can detect the new model.
    //
    //===========================================================

    [HttpPost("{id:long}/database")]

    public async Task<ActionResult>
        CreateDatabase
    (
        long id
    )
    {
        try
        {
            //===================================================
            // Load Code Synchronization
            //===================================================

            var synchronization =
                await _repository.GetByIdAsync
                (
                    id
                );


            if
            (
                synchronization == null
            )
            {
                return NotFound();
            }


            //===================================================
            // Validate Synchronization Type
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.SynchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend database creation is available only for Backend Code Synchronization."
                );
            }


            //===================================================
            // Validate Code Synchronization State
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.Status,

                    "Synchronized",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend database creation is available only after Code Synchronization has completed successfully."
                );
            }


            //===================================================
            // Validate Backend Registration
            //===================================================
            //
            // The database engine requires the generated backend
            // entity/DbSet registration to already exist.
            //
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.DbStatus,

                    "Registered",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend registration must be completed before creating the database structure."
                );
            }


            //===================================================
            // Execute Backend Database Creation
            //===================================================

            var result =
                await _backendDatabaseEngine
                    .CreateAsync
                    (
                        id
                    );


            //===================================================
            // Database Creation Failed
            //===================================================

            if
            (
                !result.Success
            )
            {
                return BadRequest
                (
                    result.Message
                );
            }


            //===================================================
            // Database Creation Successful
            //===================================================

            return Ok
            (
                result
            );
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Backend Database Remove
    //===========================================================
    //
    // Removes the physical database structure using the
    // Backend Database Engine.
    //
    // This operation is independent from Backend Registration.
    //
    // The migration history itself is preserved.
    //
    //===========================================================

    [HttpPost("{id:long}/database/rollback")]

    public async Task<ActionResult>
        RemoveDatabase
    (
        long id
    )
    {
        try
        {
            //===================================================
            // Load Code Synchronization
            //===================================================

            var synchronization =
                await _repository.GetByIdAsync
                (
                    id
                );


            if
            (
                synchronization == null
            )
            {
                return NotFound();
            }


            //===================================================
            // Validate Synchronization Type
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.SynchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend database removal is available only for Backend Code Synchronization."
                );
            }


            //===================================================
            // Validate Code Synchronization State
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.Status,

                    "Synchronized",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend database removal is available only while Code Synchronization is synchronized."
                );
            }


            //===================================================
            // Validate Backend Registration
            //===================================================
            //
            // The generated entity model must remain registered
            // while the database migration is being generated.
            //
            // Therefore the database structure is removed first.
            //
            // Backend deregistration can then be performed
            // separately.
            //
            //===================================================

            if
            (
                !string.Equals
                (
                    synchronization.DbStatus,

                    "Registered",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Backend database structure is not currently registered."
                );
            }


            //===================================================
            // Execute Backend Database Removal
            //===================================================

            var result =
                await _backendDatabaseEngine
                    .RemoveAsync
                    (
                        id
                    );


            //===================================================
            // Database Removal Failed
            //===================================================

            if
            (
                !result.Success
            )
            {
                return BadRequest
                (
                    result.Message
                );
            }


            //===================================================
            // Database Removal Successful
            //
            // IMPORTANT:
            //
            // DbStatus remains Registered because the generated
            // backend code is still registered in DbContext and
            // Dependency Injection.
            //
            // Backend deregistration remains a separate action.
            //
            //===================================================

            return Ok
            (
                result
            );
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Rollback Code Synchronization
    //===========================================================
    //
    // Code rollback is not allowed while backend registration
    // remains active.
    //
    // Physical database removal and code deregistration are
    // separate operations.
    //
    //===========================================================

    [HttpPost("{id:long}/rollback")]

    public async Task<ActionResult>
        Rollback
    (
        long id
    )
    {
        try
        {
            var synchronization =
                await _repository.GetByIdAsync
                (
                    id
                );


            if
            (
                synchronization == null
            )
            {
                return NotFound();
            }


            //===================================================
            // Prevent Code Rollback While Backend Is Registered
            //===================================================

            if
            (
                string.Equals
                (
                    synchronization.SynchronizationType,

                    "Backend",

                    StringComparison.OrdinalIgnoreCase
                )
                &&
                string.Equals
                (
                    synchronization.DbStatus,

                    "Registered",

                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return BadRequest
                (
                    "Code Synchronization rollback is not allowed while the backend registration is active. Remove the database structure and deregister the backend code first."
                );
            }


            //===================================================
            // Execute Code Rollback
            //===================================================

            var rolledBack =
                await _repository.RollbackAsync
                (
                    id
                );


            if
            (
                !rolledBack
            )
            {
                return NotFound();
            }


            return NoContent();
        }

        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Get List History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>>
        GetHistory()
    {
        var history =
            await _activityHistoryRepository
                .GetListHistoryAsync
                (
                    "Infrastructure Control",

                    "Code Synchronization"
                );


        return Ok
        (
            history
        );
    }



    //===========================================================
    // Get Code Synchronization History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>>
        GetEntityHistory
    (
        long id
    )
    {
        var history =
            await _activityHistoryRepository
                .GetHistoryAsync
                (
                    "Infrastructure Control",

                    "Code Synchronization",

                    id
                );


        return Ok
        (
            history
        );
    }

}