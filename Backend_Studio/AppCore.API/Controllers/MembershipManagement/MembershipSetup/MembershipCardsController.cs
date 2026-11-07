//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Cards Controller
//===============================================================

[ApiController]

[Route("api/membership-management/membership-setup/membership-cards")]

public class MembershipCardsController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IMembershipCardsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipCardsController(
        IMembershipCardsRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<MembershipCardsDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<MembershipCardsDefaultsDto>> GetDefaults()
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

    [HttpGet("{publicId:guid}")]

    public async Task<ActionResult<MembershipCardsDto>> GetById(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        MembershipCardsDto? card =
            await _repository.GetByIdAsync(id);

        if (card == null)
        {
            return NotFound();
        }

        return Ok(card);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateMembershipCardsDto dto)
    {
           long userId = this.CurrentUserId();

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

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]

    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateMembershipCardsDto dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        dto.MembershipCardId =
            id;

        if (!await _repository.ExistsAsync(
                dto.MembershipCardId))
        {
            return NotFound();
        }

           long userId = this.CurrentUserId();

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
    // Delete (card + its service row + its four ledgers)
    //===========================================================

    [HttpDelete("{publicId:guid}")]

    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }

           long userId = this.CurrentUserId();

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
           long userId = this.CurrentUserId();

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
            // Blocked : name / rank taken, or a ledger sub group is gone
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted membership cards available to restore.");
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
                "Membership Cards"));
    }
}