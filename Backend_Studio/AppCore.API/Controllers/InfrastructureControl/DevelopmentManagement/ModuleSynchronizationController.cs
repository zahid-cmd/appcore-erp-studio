//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Module Synchronization Controller
//===============================================================

[ApiController]

[Route(
    "api/infrastructure-control/development-management/module-synchronization"
)]

public class ModuleSynchronizationController
    : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IModuleSynchronizationRepository
        _repository;


    private readonly IActivityHistoryRepository
        _activityHistoryRepository;



    //===========================================================
    // Constructor
    //===========================================================

    public ModuleSynchronizationController
    (
        IModuleSynchronizationRepository repository,

        IActivityHistoryRepository activityHistoryRepository
    )
    {
        _repository =
            repository;


        _activityHistoryRepository =
            activityHistoryRepository;
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<ModuleSynchronizationDefaultsDto>>
        GetDefaults
    (
        [FromQuery] string type
    )
    {
        return Ok
        (
            await _repository.GetDefaultsAsync
            (
                type
            )
        );
    }



    //===========================================================
    // Analyze Module
    //===========================================================

    [HttpGet("analyze/{moduleId:long}")]

    public async Task<ActionResult<ModuleSynchronizationDto>>
        Analyze
    (
        long moduleId,

        [FromQuery] string type
    )
    {
        var result =
            await _repository.AnalyzeAsync
            (
                moduleId,

                type
            );


        if
        (
            result == null
        )
        {
            return NotFound();
        }


        return Ok
        (
            result
        );
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



    //===========================================================
    // Rollback Validation
    //===========================================================
    //
    // This endpoint ONLY validates whether the Module
    // Synchronization can be rolled back.
    //
    // It does NOT execute rollback.
    //
    // Frontend flow:
    //
    //     Rollback
    //          ↓
    //     Validate Rollback
    //          ↓
    //     CanRollback = false
    //          ↓
    //     Show Blocked Message
    //
    // OR
    //
    //     CanRollback = true
    //          ↓
    //     Open Confirm Dialog
    //          ↓
    //     Execute Rollback
    //
    //===========================================================

    [HttpGet("{id:long}/rollback-validation")]

    public async Task
        <ActionResult<ModuleSynchronizationRollbackValidationDto>>
        ValidateRollback
    (
        long id
    )
    {
        var validation =
            await _repository.ValidateRollbackAsync
            (
                id
            );


        if
        (
            validation == null
        )
        {
            return NotFound();
        }


        return Ok
        (
            validation
        );
    }



    //===========================================================
    // Rollback
    //===========================================================
    //
    // This endpoint performs the actual rollback.
    //
    // Rollback validation is performed BEFORE the confirmation
    // dialog by the frontend.
    //
    // The repository remains the authoritative protection
    // during actual rollback execution.
    //
    // Therefore, even if validation is bypassed, the backend
    // can still reject the rollback safely.
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


        //=======================================================
        // Rollback Dependency Exception
        //=======================================================
        //
        // If dependent synchronization data is detected
        // during the actual rollback, convert the exception
        // into HTTP 400 so Angular can display the message.
        //
        //=======================================================

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
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<ModuleSynchronizationDto>>>
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

    public async Task<ActionResult<ModuleSynchronizationDto>>
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
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>>
        Create
    (
        CreateModuleSynchronizationDto dto
    )
    {
        var id =
            await _repository.CreateAsync
            (
                dto
            );


        return Ok
        (
            id
        );
    }



    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]

    public async Task<ActionResult>
        Update
    (
        long id,

        UpdateModuleSynchronizationDto dto
    )
    {
        if
        (
            id != dto.Id
        )
        {
            return BadRequest();
        }


        var updated =
            await _repository.UpdateAsync
            (
                dto
            );


        if
        (
            !updated
        )
        {
            return NotFound();
        }


        return NoContent();
    }



    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<ActionResult>
        Delete
    (
        long id
    )
    {
        var deleted =
            await _repository.DeleteAsync
            (
                id
            );


        if
        (
            !deleted
        )
        {
            return NotFound();
        }


        return NoContent();
    }



    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<ActionResult>
        Restore
    (
        [FromQuery] string type
    )
    {
        var restored =
            await _repository.RestoreAsync
            (
                type
            );


        if
        (
            !restored
        )
        {
            return NotFound
            (
                $"No deleted {type} module synchronization configuration found."
            );
        }


        return NoContent();
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

                    "Module Synchronization"
                );


        return Ok
        (
            history
        );
    }



    //===========================================================
    // Get Module Synchronization History
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

                    "Module Synchronization",

                    id
                );


        return Ok
        (
            history
        );
    }
}