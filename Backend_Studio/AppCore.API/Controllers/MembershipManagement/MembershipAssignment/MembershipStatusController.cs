//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Status Controller
//===============================================================

[ApiController]

[Route("api/membership-management/membership-assignment/membership-status")]

public class MembershipStatusController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IMembershipStatusRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipStatusController(
        IMembershipStatusRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<MembershipStatusDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<MembershipStatusDefaultsDto>> GetDefaults()
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync());
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<MembershipStatusDto>> GetById(
        long id)
    {
        MembershipStatusDto? membership =
            await _repository.GetByIdAsync(id);

        if (membership == null)
        {
            return NotFound();
        }

        return Ok(membership);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateMembershipStatusDto dto)
    {
        long userId = 1;

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            return Ok(id);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateMembershipStatusDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.MembershipId))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Delete (only Pending memberships)
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

        long userId = 1;

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            //=======================================================
            // Deletion Blocked
            // HTTP 409 with a plain-text message for the toast.
            //=======================================================

            return Conflict(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        bool restored;

        try
        {
            restored =
                await _repository.RestoreAsync(
                    userId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            // Blocked : the chassis has another open membership
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted memberships available to restore.");
        }

        return NoContent();
    }


    //===========================================================
    // Free Service Windows (manual until job cards exist)
    //===========================================================

    [HttpPut("{id:long}/windows/{windowId:long}/use")]

    public async Task<IActionResult> UseWindow(
        long id,
        long windowId,
        UseMembershipServiceDto dto)
    {
        return await Run(() => _repository.UseWindowAsync(id, windowId, dto, 1));
    }


    [HttpPut("{id:long}/windows/{windowId:long}/undo-use")]

    public async Task<IActionResult> UndoUseWindow(
        long id,
        long windowId)
    {
        return await Run(() => _repository.UndoUseWindowAsync(id, windowId, 1));
    }


    [HttpPut("{id:long}/windows/{windowId:long}/approve")]

    public async Task<IActionResult> ApproveWindow(
        long id,
        long windowId,
        ApproveMembershipServiceDto dto)
    {
        return await Run(() => _repository.ApproveWindowAsync(id, windowId, dto, 1));
    }


    private async Task<IActionResult> Run(
        Func<Task> action)
    {
        try
        {
            await action();
        }
        catch
        (
            KeyNotFoundException ex
        )
        {
            return NotFound(ex.Message);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest(ex.Message);
        }

        return NoContent();
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Membership Management",
                "Membership Status"));
    }
}