//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InventoryManagement.ProductReceiving;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InventoryManagement.ProductReceiving;


//===============================================================
// Product Receiving Controller : the endpoints of every
// receiving page. Each page's controller (MB / SP / AC) only
// gives its route, page type and repository.
//
//   GET                       the page's receivings
//   GET defaults?branchId=&date=
//   GET pending-purchases?branchId=
//   POST unit-check           { Units } (MB)
//   GET {id}
//   POST                      create = post        (Add)
//   PUT {id}/cancel           { Reason }           (Cancel)
//   PUT accessory-dues/{dueId}/close?branchId=  { Reason }  (MB, Add)
//
// 400 : input or rule broken ; 403 : no permission ;
// 404 : not found
//===============================================================

public abstract class ReceivingControllerBase : ControllerBase
{
    private readonly IReceivingRepository _repository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;


    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    protected ReceivingControllerBase(
        IReceivingRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
    {
        _repository = repository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }


    //===========================================================
    // This page
    //===========================================================

    // MB / SP / AC
    protected abstract string PageType { get; }

    // "/inventory-management/%/motor-bike-receiving"
    protected abstract string PageRoute { get; }


    //===========================================================
    // Permission : null when allowed, else the 403 answer
    //===========================================================

    private async Task<IActionResult?> DenyAsync
    (
        string activity
    )
    {
        bool allowed =
            await _effectiveAccess.HasActivityAsync(
                UserId,
                PageRoute,
                activity);

        return allowed
            ? null
            : StatusCode(
                StatusCodes.Status403Forbidden,
                $"You do not have the \"{activity}\" permission on this Receiving page.");
    }


    //===========================================================
    // Run an action with the standard error answers
    //===========================================================

    private async Task<IActionResult> Run
    (
        Func<Task<IActionResult>> action,
        string failure
    )
    {
        try
        {
            return await action();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Failure}", failure);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                failure);
        }
    }


    //===========================================================
    // Read
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync(PageType)),
            "Failed to load the receivings.");
    }


    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] ReceivingPageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(PageType, request ?? new ReceivingPageRequest())),
            "Failed to load the receivings.");
    }


    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] long branchId,
        [FromQuery] string? date)
    {
        return Run(
            async () =>
            {
                DateOnly day =
                    DateOnly.TryParseExact(
                        (date ?? string.Empty).Trim(),
                        "yyyy-MM-dd",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateOnly parsed)
                        ? parsed
                        : DateOnly.FromDateTime(DateTime.Now);

                return Ok(
                    await _repository.GetDefaultsAsync(
                        PageType,
                        branchId,
                        day));
            },
            "Failed to load the receiving defaults.");
    }


    [HttpGet("pending-purchases")]
    public Task<IActionResult> GetPendingPurchases(
        [FromQuery] long branchId)
    {
        return Run(
            async () => Ok(await _repository.GetPendingPurchasesAsync(PageType, branchId)),
            "Failed to load the purchases to receive.");
    }


    [HttpPost("unit-check")]
    public Task<IActionResult> CheckUnits(
        [FromBody] ReceivingUnitCheckDto? dto)
    {
        return Run(
            async () => Ok(await _repository.CheckUnitsAsync(dto ?? new ReceivingUnitCheckDto())),
            "Failed to check the bike numbers.");
    }


    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> GetById(
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

        ReceivingDto? item =
            await _repository.GetByIdAsync(id);

        return item == null || item.PageType != PageType
            ? NotFound("Receiving not found.")
            : Ok(item);
    }


    //===========================================================
    // Create (posted on save) / Cancel
    //===========================================================

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateReceivingDto dto)
    {
        long userId = UserId;

        // Always this page's type
        dto.PageType = PageType;

        IActionResult? denied =
            await DenyAsync("Add");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () => Ok(await _repository.CreateAsync(dto, userId)),
            "Failed to post the receiving.");
    }


    // MB : Close Due : the rest of a free-accessory due row is
    // written off (needs the Add permission, like receiving)
    [HttpPut("accessory-dues/{dueId:long}/close")]
    public async Task<IActionResult> CloseAccessoryDue(
        long dueId,
        [FromQuery] long branchId,
        [FromBody] CloseAccessoryDueDto? dto)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyAsync("Add");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.CloseAccessoryDueAsync(dueId, branchId, dto ?? new CloseAccessoryDueDto(), userId);

                return NoContent();
            },
            "Failed to close the accessory due.");
    }


    // Cancelled by the uuid in the address (point 2)
    [HttpPut("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(
        Guid publicId,
        [FromBody] CancelReceivingDto? dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Receiving not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        ReceivingDto? item =
            await _repository.GetByIdAsync(id);

        if (item == null || item.PageType != PageType)
        {
            return NotFound("Receiving not found.");
        }

        IActionResult? denied =
            await DenyAsync("Cancel");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.CancelAsync(id, dto ?? new CancelReceivingDto(), userId);

                return NoContent();
            },
            "Failed to cancel the receiving.");
    }
}
