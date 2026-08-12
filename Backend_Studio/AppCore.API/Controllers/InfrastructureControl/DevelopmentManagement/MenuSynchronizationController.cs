//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Menu Synchronization Controller
//===============================================================

[ApiController]

[Route(
    "api/infrastructure-control/development-management/menu-synchronization"
)]

public class MenuSynchronizationController : ControllerBase
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly IMenuSynchronizationRepository
        _repository;


    private readonly IActivityHistoryRepository
        _activityHistoryRepository;



    //===========================================================
    // Constructor
    //===========================================================

    public MenuSynchronizationController
    (
        IMenuSynchronizationRepository repository,

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

    public async Task<ActionResult<MenuSynchronizationDefaultsDto>> GetDefaults
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
    // Analyze Menu
    //===========================================================

    [HttpGet("analyze/{moduleId:long}/{menuId:long}")]

    public async Task<ActionResult<MenuSynchronizationDto>> Analyze
    (
        long moduleId,

        long menuId,

        [FromQuery] string type
    )
    {
        var result =
            await _repository.AnalyzeAsync
            (
                moduleId,

                menuId,

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
    // Menu synchronization is allowed only when the parent
    // Module Synchronization has already been successfully
    // synchronized.
    //
    // The repository is responsible for applying that rule.
    //
    // If the repository rejects the operation because the
    // parent Module is not synchronized, return HTTP 400 so
    // the frontend can display the business-rule message.
    //
    //===========================================================

    [HttpPost("{id:long}/sync")]

    public async Task<ActionResult> Sync
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
        // Parent Module Synchronization Dependency
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
    // Rollback Validation
    //===========================================================
    //
    // This endpoint ONLY checks whether rollback is allowed.
    //
    // It does NOT execute rollback.
    //
    // The frontend calls this endpoint before displaying the
    // rollback confirmation dialog.
    //
    // The repository remains responsible for determining
    // whether a dependent Submenu Synchronization has actually
    // been synchronized.
    //
    //===========================================================

    [HttpGet("{id:long}/rollback-validation")]

    public async Task<ActionResult<MenuSynchronizationRollbackValidationDto>>
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
    // The repository remains the authoritative protection
    // during actual rollback execution.
    //
    // If dependent synchronization data prevents rollback,
    // return HTTP 400 instead of allowing an unhandled
    // exception to become HTTP 500.
    //
    //===========================================================

    [HttpPost("{id:long}/rollback")]

    public async Task<ActionResult> Rollback
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

    public async Task<ActionResult<List<MenuSynchronizationDto>>> GetAll
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

    public async Task<ActionResult<MenuSynchronizationDto>> GetById
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

    public async Task<ActionResult<long>> Create
    (
        CreateMenuSynchronizationDto dto
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

    public async Task<ActionResult> Update
    (
        long id,

        UpdateMenuSynchronizationDto dto
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

    public async Task<ActionResult> Delete
    (
        long id
    )
    {
        try
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


        //=======================================================
        // Delete Dependency Exception
        //=======================================================
        //
        // If active dependent Submenu Synchronization data
        // exists, the repository rejects the delete operation.
        //
        // This is an expected business-rule result, so return
        // HTTP 400 with the repository message for the frontend.
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
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<ActionResult> Restore
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
                $"No deleted {type} menu synchronization configuration found."
            );
        }


        return NoContent();
    }



    //===========================================================
    // Get List History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        var history =
            await _activityHistoryRepository
                .GetListHistoryAsync
                (
                    "Infrastructure Control",

                    "Menu Synchronization"
                );


        return Ok
        (
            history
        );
    }



    //===========================================================
    // Get Menu Synchronization History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetEntityHistory
    (
        long id
    )
    {
        var history =
            await _activityHistoryRepository
                .GetHistoryAsync
                (
                    "Infrastructure Control",

                    "Menu Synchronization",

                    id
                );


        return Ok
        (
            history
        );
    }

}