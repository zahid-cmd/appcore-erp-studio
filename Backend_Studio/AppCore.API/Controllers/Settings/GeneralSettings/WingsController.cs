//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.Wings.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.GeneralSettings;


//===============================================================
// Wing Controller
//===============================================================

[ApiController]

[Route("api/settings/general-settings/wings")]

public class WingsController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly IWingsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===============================================================
    // Constructor
    //===============================================================

    public WingsController(
        IWingsRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<WingDto>>> GetAll()
    {
        List<WingDto> wings =
            await _repository.GetAllAsync();

        return Ok(wings);
    }


    //===============================================================
    // Get Paged (server paging; Counts = Total / Active / Inactive)
    //===============================================================

    [HttpGet("paged")]

    public async Task<IActionResult> GetPaged(
        [FromQuery] GeneralSettingsPageRequest request)
    {
        return Ok(await _repository.GetPagedAsync(request));
    }


    //===============================================================
    // Get Next Code
    //===============================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode(
        [FromQuery] long companyId)
    {
        try
        {
            return Ok(
                await _repository.GetNextCodeAsync(
                    companyId));
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


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<WingsDefaultsDto>> GetDefaults(
        [FromQuery] long companyId)
    {
        try
        {
            return Ok(
                await _repository.GetDefaultsAsync(
                    companyId));
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


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{publicId:guid}")]
    public async Task<ActionResult<WingDto>> GetById(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        WingDto? wing =
            await _repository.GetByIdAsync(id);

        if (wing == null)
        {
            return NotFound();
        }

        return Ok(wing);
    }


    //===============================================================
    // Create
    //===============================================================

    // Returns the new row's Public Id
    [HttpPost]
    public async Task<ActionResult<Guid>> Create(
        CreateWingDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            WingDto? created =
                await _repository.GetByIdAsync(id);

            return Ok(created?.PublicId ?? Guid.Empty);
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


    //===============================================================
    // Update
    //===============================================================

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateWingDto dto)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        dto.WingId =
            id;

        if (!await _repository.ExistsAsync(
                dto.WingId))
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


    //===============================================================
    // Delete
    //===============================================================

    [HttpDelete("{publicId:guid}")]

    public async Task<IActionResult> Delete(
        Guid publicId)
    {
        long? found =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (found == null)
        {
            return NotFound();
        }

        long id =
            found.Value;

        //===========================================================
        // Verify Wing Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }


        //===========================================================
        // Current User
        //===========================================================

           long userId = this.CurrentUserId();


        //===========================================================
        // Delete
        //===========================================================

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
            //
            // Raised by the repository when Branches or Warehouses
            // still exist under this Wing. Returned as HTTP 409
            // with a plain-text message for the "Delete Blocked"
            // toast.
            //=======================================================

            return Conflict(ex.Message);
        }


        //===========================================================
        // Delete Successful
        //===========================================================

        return NoContent();
    }


    //===============================================================
    // Restore
    //===============================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
           long userId = this.CurrentUserId();

        bool restored =
            await _repository.RestoreAsync(
                userId);

        if (!restored)
        {
            return NotFound(
                "There are no deleted wings available to restore.");
        }

        return NoContent();
    }


    //===============================================================
    // Get History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "General Settings",
                "Wing"));
    }
}