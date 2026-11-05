//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.Paging;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.ClientSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.ClientSettings;


//===============================================================
// Supplier Profiles Controller
//
// A supplier is opened / changed by its Public Id (uuid), never
// by the internal number :
//
//   GET    paged          the list page (one page, server side;
//                         see SupplierProfilesPageRequest)
//   GET    {publicId}     one supplier
//   POST                  create -> its Public Id
//   PUT    {publicId}     update
//   DELETE {publicId}     delete
//
// GET (all) stays for the dropdowns / lookups / prints of other
// pages.
//===============================================================

[ApiController]

[Route("api/settings/client-settings/supplier-profiles")]

public class SupplierProfilesController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly ISupplierProfilesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public SupplierProfilesController(
        ISupplierProfilesRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<SupplierProfilesDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Get Paged (the list page)
    //===========================================================

    [HttpGet("paged")]

    public async Task<ActionResult<PagedResult<SupplierProfilesDto>>> GetPaged(
        [FromQuery] SupplierProfilesPageRequest request)
    {
        return Ok(
            await _repository.GetPagedAsync(
                request ?? new SupplierProfilesPageRequest()));
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<SupplierProfilesDefaultsDto>> GetDefaults()
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
    // Get By Public Id
    //===========================================================

    [HttpGet("{publicId:guid}")]

    public async Task<ActionResult<SupplierProfilesDto>> GetByPublicId(
        Guid publicId)
    {
        long? id =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (id == null)
        {
            return NotFound();
        }

        SupplierProfilesDto? supplier =
            await _repository.GetByIdAsync(id.Value);

        if (supplier == null)
        {
            return NotFound();
        }

        return Ok(supplier);
    }


    //===========================================================
    // Create
    //===========================================================

    // Returns the new supplier's Public Id
    [HttpPost]

    public async Task<ActionResult<Guid>> Create(
        CreateSupplierProfilesDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            long id =
                await _repository.CreateAsync(
                    dto,
                    userId);

            SupplierProfilesDto? created =
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


    //===========================================================
    // Update
    //===========================================================

    // The supplier comes from the link's Public Id; a SupplierId
    // in the body is ignored
    [HttpPut("{publicId:guid}")]

    public async Task<IActionResult> Update(
        Guid publicId,
        UpdateSupplierProfilesDto dto)
    {
        long? id =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (id == null)
        {
            return NotFound();
        }

        dto.SupplierId =
            id.Value;

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
    // Delete
    //===========================================================

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
            // Blocked : phone / BIN / TIN taken, or the ledger sub group is gone
            return Conflict(ex.Message);
        }

        if (!restored)
        {
            return NotFound(
                "There are no deleted suppliers available to restore.");
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
                "Client Settings",
                "Supplier Profiles"));
    }
}