//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


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



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationController
    (
        ICodeSynchronizationRepository repository,

        IActivityHistoryRepository activityHistoryRepository
    )
    {
        _repository =
            repository;


        _activityHistoryRepository =
            activityHistoryRepository;
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
    //
    // Restores one modified generated file to the state produced
    // by the last successful synchronization.
    //
    // This is separate from Code Synchronization Rollback.
    //
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


        //=======================================================
        // Restore Dependency Exception
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
    // Restore All Modified Files
    //===========================================================
    //
    // Restores all modified generated files belonging to this
    // Code Synchronization record to their last synchronized
    // state.
    //
    // This does not perform Code Synchronization Rollback.
    //
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


        //=======================================================
        // Restore All Dependency Exception
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
    // Synchronize
    //===========================================================
    //
    // Code synchronization generates the code files defined
    // by the corresponding Submenu Synchronization record.
    //
    // The repository remains responsible for enforcing the
    // synchronization business rules.
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
        // Synchronization Dependency Exception
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
    // Rollback removes/reverts the generated code belonging
    // to the Code Synchronization record.
    //
    // The repository remains responsible for enforcing all
    // rollback dependency and business rules.
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