//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Application.SecurityPermission.UserManagement.RoleAssignment.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.SecurityPermission.UserManagement;


//===============================================================
// Role Assignment Controller
//===============================================================

[ApiController]

[Route("api/security-permission/user-management/role-assignment")]

public class RoleAssignmentController
    : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IRoleAssignmentRepository
        _repository;

    private readonly IActivityHistoryRepository
        _historyRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public RoleAssignmentController
    (
        IRoleAssignmentRepository repository,

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
            ActionResult<RoleAssignmentDefaultsDto>
        >
        GetDefaults()
    {
        RoleAssignmentDefaultsDto result =
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
            ActionResult<List<RoleAssignmentDto>>
        >
        GetAll()
    {
        List<RoleAssignmentDto> result =
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

                "Role Assignment"
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
            ActionResult<RoleAssignmentDto>
        >
        GetById
        (
            long id
        )
    {
        RoleAssignmentDto? result =
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
            ActionResult<RoleAssignmentDto>
        >
        GetByUserProfileId
        (
            long userProfileId
        )
    {
        RoleAssignmentDto? result =
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

                "Role Assignment",

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
            CreateRoleAssignmentDto dto
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
                        "Role assignment validation failed.",

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
                        "Failed to create role assignment.",

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
            UpdateRoleAssignmentDto dto
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
                        "Role assignment validation failed.",

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
                        "Failed to update role assignment.",

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
                        "Failed to delete role assignment.",

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
                        "Failed to restore role assignment.",

                    message =
                        message
                }
            );
        }
    }
}