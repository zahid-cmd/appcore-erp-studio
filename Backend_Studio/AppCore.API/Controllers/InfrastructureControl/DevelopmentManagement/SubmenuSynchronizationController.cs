//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Submenu Synchronization Controller
//===============================================================

[ApiController]

[Route(
    "api/infrastructure-control/development-management/submenu-synchronization"
)]

public class SubmenuSynchronizationController
    : ControllerBase
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly ISubmenuSynchronizationRepository
        _repository;


    private readonly IActivityHistoryRepository
        _activityHistoryRepository;



    //===========================================================
    // Constructor
    //===========================================================

    public SubmenuSynchronizationController
    (
        ISubmenuSynchronizationRepository repository,

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

    public async Task<ActionResult<SubmenuSynchronizationDefaultsDto>>
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
    // Analyze Submenu
    //===========================================================

    [HttpGet("analyze/{moduleId:long}/{menuId:long}/{submenuId:long}")]

    public async Task<ActionResult<SubmenuSynchronizationDto>>
        Analyze
    (
        long moduleId,

        long menuId,

        long submenuId,

        [FromQuery] string type
    )
    {
        var result =
            await _repository.AnalyzeAsync
            (
                moduleId,

                menuId,

                submenuId,

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
    // Sync
    //===========================================================
    //
    // Submenu synchronization is allowed only when its parent
    // Menu Synchronization has already been successfully
    // synchronized.
    //
    // The repository remains responsible for enforcing this
    // business rule.
    //
    // If the repository rejects the operation because the
    // parent Menu is not synchronized, return HTTP 400 so the
    // frontend can display the business-rule message.
    //
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


        //=======================================================
        // Parent Menu Synchronization Dependency
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
    // Rollback
    //===========================================================
    //
    // The repository remains the authoritative protection
    // during actual rollback execution.
    //
    // If a dependent synchronization prevents rollback,
    // return HTTP 400 instead of allowing an unhandled
    // exception to become HTTP 500.
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

    public async Task<ActionResult<List<SubmenuSynchronizationDto>>>
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

    public async Task<ActionResult<SubmenuSynchronizationDto>>
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
        CreateSubmenuSynchronizationDto dto
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

        UpdateSubmenuSynchronizationDto dto
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
                $"No deleted {type} submenu synchronization configuration found."
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

                    "Submenu Synchronization"
                );


        return Ok
        (
            history
        );
    }



    //===========================================================
    // Get Submenu Synchronization History
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

                    "Submenu Synchronization",

                    id
                );


        return Ok
        (
            history
        );
    }

}