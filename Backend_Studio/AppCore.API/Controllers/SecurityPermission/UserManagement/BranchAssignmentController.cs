//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Application.SecurityPermission.UserManagement.BranchAssignment.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.SecurityPermission.UserManagement;


//===============================================================
// Branch Assignment Controller
//===============================================================

[ApiController]

[Route("api/security-permission/user-management/branch-assignment")]

public class BranchAssignmentController
    : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IBranchAssignmentRepository
        _repository;

    private readonly IActivityHistoryRepository
        _historyRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public BranchAssignmentController
    (
        IBranchAssignmentRepository repository,

        IActivityHistoryRepository historyRepository
    )
    {
        _repository =
            repository;

        _historyRepository =
            historyRepository;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task
        <
            ActionResult<BranchAssignmentDefaultsDto>
        >
        GetDefaults()
    {
        BranchAssignmentDefaultsDto result =
            await _repository.GetDefaultsAsync();

        return Ok(
            result
        );
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task
        <
            ActionResult<List<BranchAssignmentDto>>
        >
        GetAll()
    {
        List<BranchAssignmentDto> result =
            await _repository.GetAllAsync();

        return Ok(
            result
        );
    }


    //===========================================================
    // Get List History
    //===========================================================

    [HttpGet("history")]

    public async Task
        <
            ActionResult<List<ActivityHistoryDto>>
        >
        GetListHistory()
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetListHistoryAsync
            (
                "Security & Permission",

                "Branch Assignment"
            );

        return Ok(
            history
        );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task
        <
            ActionResult<BranchAssignmentDto>
        >
        GetById
        (
            long id
        )
    {
        BranchAssignmentDto? result =
            await _repository.GetByIdAsync(
                id
            );

        if
        (
            result
            ==
            null
        )
        {
            return NotFound();
        }

        return Ok(
            result
        );
    }


    //===========================================================
    // Get By User Profile Id
    //===========================================================

    [HttpGet("user-profile/{userProfileId:long}")]

    public async Task
        <
            ActionResult<BranchAssignmentDto>
        >
        GetByUserProfileId
        (
            long userProfileId
        )
    {
        BranchAssignmentDto? result =
            await _repository.GetByUserProfileIdAsync
            (
                userProfileId
            );

        if
        (
            result
            ==
            null
        )
        {
            return NotFound();
        }

        return Ok(
            result
        );
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task
        <
            ActionResult<List<ActivityHistoryDto>>
        >
        GetHistory
        (
            long id
        )
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetHistoryAsync
            (
                "Security & Permission",

                "Branch Assignment",

                id
            );

        return Ok(
            history
        );
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>>
        Create
        (
            CreateBranchAssignmentDto dto
        )
    {
        try
        {
            long id =
                await _repository.CreateAsync(
                    dto
                );

            return Ok(
                id
            );
        }
        catch
        (
            DbUpdateException ex
        )
        {
            //===================================================
            // Database Error
            //===================================================

            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Database update failed.",

                    message =
                        message
                }
            );
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            //===================================================
            // Business / Validation Error
            //===================================================

            return BadRequest
            (
                new
                {
                    success = false,

                    error =
                        "Branch assignment validation failed.",

                    message =
                        ex.Message
                }
            );
        }
        catch
        (
            Exception ex
        )
        {
            //===================================================
            // General Error
            //===================================================

            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to create branch assignment.",

                    message =
                        message
                }
            );
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult>
        Update
        (
            UpdateBranchAssignmentDto dto
        )
    {
        try
        {
            bool updated =
                await _repository.UpdateAsync(
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
        catch
        (
            DbUpdateException ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Database update failed.",

                    message =
                        message
                }
            );
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest
            (
                new
                {
                    success = false,

                    error =
                        "Branch assignment validation failed.",

                    message =
                        ex.Message
                }
            );
        }
        catch
        (
            Exception ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to update branch assignment.",

                    message =
                        message
                }
            );
        }
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult>
        Delete
        (
            long id
        )
    {
        try
        {
            bool deleted =
                await _repository.DeleteAsync(
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
        catch
        (
            Exception ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to delete branch assignment.",

                    message =
                        message
                }
            );
        }
    }


    //===========================================================
    // Restore Last Deleted
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult>
        Restore()
    {
        try
        {
            bool restored =
                await _repository.RestoreLastDeletedAsync();

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
            Exception ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to restore branch assignment.",

                    message =
                        message
                }
            );
        }
    }
}