//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Orders - MB Controller (Motor Bike Purchase)
//
// This page only : PageType is always MB (a ?pageType sent by an
// older page is ignored). SP / AC have their own controllers.
//
// 400 : input or rule broken ; 403 : no permission ;
// 404 : not found
//
// Every change checks the user's activity on the order's page
// (Role Assignment + Special Assignment) :
//   Create : Add          Update : Update      Delete : Delete
//   Restore : Restore     Approve : Approve    Return : Return
//   Place : Place Order   Close Short : Close Short
//   Cancel : Cancel
//===============================================================

[ApiController]

[Route("api/procurement/motor-bike-purchase/purchase-orders-mb")]

public class PurchaseOrdersMbController : ControllerBase
{
    private readonly IPurchaseOrdersMbRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger<PurchaseOrdersMbController> _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    public PurchaseOrdersMbController(
        IPurchaseOrdersMbRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PurchaseOrdersMbController> logger)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;

        _effectiveAccess = effectiveAccess;

        _logger = logger;
    }


    //===========================================================
    // This page (found by route, so the submenu code is never
    // written here)
    //===========================================================

    private const string PageType = "MB";

    private const string PageRoute =
        "/procurement/%/purchase-orders-mb";


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
                $"You do not have the \"{activity}\" permission on this Purchase Order page.");
    }


    // The order's own page decides (an id never trusts the client)
    private async Task<IActionResult?> DenyForOrderAsync
    (
        long id,
        string activity
    )
    {
        PurchaseOrdersMbDto? order =
            await _repository.GetByIdAsync(id);

        if (order == null || order.PageType != PageType)
        {
            return NotFound("Purchase Order not found.");
        }

        return await DenyAsync(
            activity);
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
    // Get All (one page)
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll()
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync(PageType)),
            "Failed to load the purchase orders.");
    }


    //===========================================================
    // Get Defaults : number preview, period, suppliers, products
    //   GET defaults?branchId=1&date=2026-10-28
    //===========================================================

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
            "Failed to load the purchase order defaults.");
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(
        long id)
    {
        PurchaseOrdersMbDto? item =
            await _repository.GetByIdAsync(id);

        return item == null || item.PageType != PageType
            ? NotFound("Purchase Order not found.")
            : Ok(item);
    }


    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public async Task<IActionResult> Create(
        CreatePurchaseOrdersMbDto dto)
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
            "Failed to create the purchase order.");
    }


    [HttpPut]
    public async Task<IActionResult> Update(
        UpdatePurchaseOrdersMbDto dto)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(dto.PurchaseOrderId, "Update");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.UpdateAsync(dto, userId);

                return NoContent();
            },
            "Failed to update the purchase order.");
    }


    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(
        long id)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(id, "Delete");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.DeleteAsync(id, userId);

                return NoContent();
            },
            "Failed to delete the purchase order.");
    }


    [HttpPut("restore")]
    public async Task<IActionResult> Restore()
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyAsync("Restore");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
                await _repository.RestoreAsync(PageType, userId)
                    ? NoContent()
                    : NotFound("There are no deleted purchase orders available to restore."),
            "Failed to restore the purchase order.");
    }


    //===========================================================
    // Workflow
    //===========================================================

    [HttpPut("{id:long}/approve")]
    public async Task<IActionResult> Approve(
        long id)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(id, "Approve");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.ApproveAsync(id, userId);

                return NoContent();
            },
            "Failed to approve the purchase order.");
    }


    [HttpPut("{id:long}/return-to-draft")]
    public async Task<IActionResult> ReturnToDraft(
        long id)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(id, "Return");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.ReturnToDraftAsync(id, userId);

                return NoContent();
            },
            "Failed to return the purchase order to draft.");
    }


    [HttpPut("{id:long}/place")]
    public async Task<IActionResult> Place(
        long id)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(id, "Place Order");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.PlaceAsync(id, userId);

                return NoContent();
            },
            "Failed to place the purchase order.");
    }


    [HttpPut("{id:long}/close-short")]
    public async Task<IActionResult> CloseShort(
        long id,
        ClosePurchaseOrderDto dto)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(id, "Close Short");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.CloseShortAsync(id, dto, userId);

                return NoContent();
            },
            "Failed to close the purchase order.");
    }


    [HttpPut("{id:long}/cancel")]
    public async Task<IActionResult> Cancel(
        long id,
        ClosePurchaseOrderDto dto)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(id, "Cancel");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.CancelAsync(id, dto, userId);

                return NoContent();
            },
            "Failed to cancel the purchase order.");
    }


    //===========================================================
    // History (one page)
    //===========================================================

    [HttpGet("history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Procurement",
                $"PurchaseOrder{PageType}"));
    }
}