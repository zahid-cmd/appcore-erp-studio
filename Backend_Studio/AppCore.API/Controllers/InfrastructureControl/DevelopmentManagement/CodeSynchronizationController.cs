//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendRegistrationEngine;

using AppCore.Application.Platform.SynchronizationEngineInterfaces.DatabaseEngine;


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


    private readonly IDatabaseMigrationEngine
        _databaseMigrationEngine;


    private readonly IDatabaseCreationEngine
        _databaseCreationEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationController
    (
        ICodeSynchronizationRepository repository,

        IActivityHistoryRepository activityHistoryRepository,

        IBackendRegistrationEngine backendRegistrationEngine,

        IDatabaseMigrationEngine databaseMigrationEngine,

        IDatabaseCreationEngine databaseCreationEngine
    )
    {
        _repository =
            repository;


        _activityHistoryRepository =
            activityHistoryRepository;


        _backendRegistrationEngine =
            backendRegistrationEngine;


        _databaseMigrationEngine =
            databaseMigrationEngine;


        _databaseCreationEngine =
            databaseCreationEngine;
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
    // Backend Registration
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
    // Backend Deregistration
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
    // Migration Create
    //===========================================================

    [HttpPost("{id:long}/migration/create")]

    public async Task<ActionResult>
        CreateMigration
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


            var submenuId =
                synchronization.SubmenuId;


            var entityName =
                $"Submenu_{submenuId}";


            await _databaseMigrationEngine
                .CreateAsync
                (
                    id,

                    entityName
                );


            //===================================================
            // Persist Migration State
            //===================================================

            var statusUpdated =
                await _repository
                    .UpdateMigrationStatusAsync
                    (
                        id,

                        true,

                        "Migration created successfully."
                    );


            if
            (
                !statusUpdated
            )
            {
                return BadRequest
                (
                    "Migration was created successfully, but the migration status could not be saved."
                );
            }


            return Ok
            (
                "Migration created successfully. Physical migration file and Designer file were created."
            );
        }

        catch
        (
            ArgumentException exception
        )
        {
            await _repository
                .UpdateMigrationStatusAsync
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

        catch
        (
            InvalidOperationException exception
        )
        {
            await _repository
                .UpdateMigrationStatusAsync
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

        catch
        (
            IOException exception
        )
        {
            await _repository
                .UpdateMigrationStatusAsync
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
    // Migration Remove
    //===========================================================

    [HttpPost("{id:long}/migration/remove")]

    public async Task<ActionResult>
        RemoveMigration
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


            await _databaseMigrationEngine
                .RemoveAsync
                (
                    id
                );


            //===================================================
            // Persist Migration Removal State
            //===================================================

            var statusUpdated =
                await _repository
                    .UpdateMigrationRemovalStatusAsync
                    (
                        id,

                        "Migration removed successfully."
                    );


            if
            (
                !statusUpdated
            )
            {
                return BadRequest
                (
                    "Migration was removed successfully, but the migration removal status could not be saved."
                );
            }


            return Ok
            (
                "Migration removed successfully. Physical migration file and Designer file were removed."
            );
        }

        catch
        (
            ArgumentException exception
        )
        {
            return BadRequest
            (
                exception.Message
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

        catch
        (
            IOException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Database Create
    //===========================================================

    [HttpPost("{id:long}/database/create")]

    public async Task<ActionResult>
        CreateDatabase
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


            await _databaseCreationEngine
                .CreateAsync
                (
                    id
                );


            return Ok
            (
                "Database created successfully."
            );
        }

        catch
        (
            ArgumentException exception
        )
        {
            return BadRequest
            (
                exception.Message
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

        catch
        (
            IOException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }



    //===========================================================
    // Database Remove
    //===========================================================

    [HttpPost("{id:long}/database/remove")]

    public async Task<ActionResult>
        RemoveDatabase
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


            await _databaseCreationEngine
                .RemoveAsync
                (
                    id
                );


            return Ok
            (
                "Database removed successfully."
            );
        }

        catch
        (
            ArgumentException exception
        )
        {
            return BadRequest
            (
                exception.Message
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

        catch
        (
            IOException exception
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
                    "Code Synchronization rollback is not allowed while the backend registration is active."
                );
            }


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