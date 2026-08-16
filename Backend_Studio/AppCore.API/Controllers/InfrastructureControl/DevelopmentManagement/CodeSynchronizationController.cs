//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendRegistrationEngine;


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



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationController
    (
        ICodeSynchronizationRepository repository,

        IActivityHistoryRepository activityHistoryRepository,

        IBackendRegistrationEngine backendRegistrationEngine
    )
    {
        _repository =
            repository;


        _activityHistoryRepository =
            activityHistoryRepository;


        _backendRegistrationEngine =
            backendRegistrationEngine;
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
    // Registration is a separate operation from Code
    // Synchronization.
    //
    // Code Synchronization:
    //
    //     Generates and builds backend code.
    //
    // Backend Registration:
    //
    //     Registers the generated backend structure with the
    //     database.
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
                    "Backend database registration is available only for Backend Code Synchronization."
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
    // Backend Database Registration Rollback
    //===========================================================
    //
    // This is separate from Code Synchronization Rollback.
    //
    // Code Rollback:
    //
    //     Reverts/removes generated code.
    //
    // Registration Rollback:
    //
    //     Reverts database registration.
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
                    "Backend database registration rollback is available only for Backend Code Synchronization."
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
            // Execute Registration Rollback
            //===================================================

            var result =
                await _backendRegistrationEngine
                    .RollbackAsync
                    (
                        submenuSynchronization
                    );


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
    // Rollback Code Synchronization
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