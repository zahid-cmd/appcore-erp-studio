//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Procurement.Shared;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Procurement.Shared;


//===============================================================
// Purchases Controller : the endpoints of every Purchases page. Each page's controller (MB / SP / AC) only gives
// its route, page type and repository.
//
// The page type is always the controller's own (a ?pageType sent
// by an older page is ignored).
//
// 400 : input or rule broken ; 403 : no permission ;
// 404 : not found
//
// Every change checks the user's activity on the order's page
// (Role Assignment + Special Assignment) :
//   Create : Add          Update : Update      Delete : Delete
//   Restore : Restore     Approve : Approve    Return : Return
//   Post : Post           Cancel : Cancel
//
// Point 2 (06-11) : save (PUT) and every action address the
// purchase by its uuid (PublicId) ; the number stays inside.
//===============================================================

public abstract class PurchaseControllerBase : ControllerBase
{
    private readonly IPurchaseRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    protected PurchaseControllerBase(
        IPurchaseRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
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

    // MB / SP / AC
    protected abstract string PageType { get; }

    // "/procurement/%/purchases-sp"
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
                $"You do not have the \"{activity}\" permission on this Purchases page.");
    }


    // The order's own page decides (an id never trusts the client)
    private async Task<IActionResult?> DenyForOrderAsync
    (
        long id,
        string activity
    )
    {
        PurchaseDto? order =
            await _repository.GetByIdAsync(id);

        if (order == null || order.PageType != PageType)
        {
            return NotFound("Purchase not found.");
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
            "Failed to load the purchases.");
    }


    //===========================================================
    // List page : one page + tab counts ; supplier filter options
    //   GET paged?page=1&pageSize=10&search=&sort=&dir=&tab=&supplier=
    //===========================================================

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] PurchasePageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(PageType, request ?? new PurchasePageRequest())),
            "Failed to load the purchases.");
    }


    // GET list-suppliers?status=Draft (the list's Status filter;
    // empty = every status)
    [HttpGet("list-suppliers")]
    public Task<IActionResult> GetListSuppliers(
        [FromQuery] string? status)
    {
        return Run(
            async () => Ok(await _repository.GetListSuppliersAsync(PageType, status)),
            "Failed to load the suppliers.");
    }


    // GET item-summary/{publicId} : the purchase's items in short
    // (the list's hover card; bikes per model)
    [HttpGet("item-summary/{publicId:guid}")]
    public Task<IActionResult> GetItemSummary(
        Guid publicId)
    {
        return Run(
            async () =>
            {
                List<PurchaseItemSummaryDto>? items =
                    await _repository.GetItemSummaryAsync(PageType, publicId);

                return items == null
                    ? (IActionResult)NotFound(new { message = "Purchase not found." })
                    : Ok(items);
            },
            "Failed to load the items.");
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
            "Failed to load the purchase defaults.");
    }


    //===========================================================
    // Last terms per item (MRP : any supplier ; profit : this
    // supplier)
    //   GET last-terms?supplierCode=SUP-000001
    //===========================================================

    [HttpGet("last-terms")]
    public Task<IActionResult> GetLastTerms(
        [FromQuery] string? supplierCode)
    {
        return Run(
            async () => Ok(await _repository.GetLastTermsAsync(PageType, supplierCode ?? string.Empty)),
            "Failed to load the last prices.");
    }


    //===========================================================
    // Mushak 6.3 No check (live)
    //   GET mushak-check?supplierCode=SUP-000001&mushakNo=4534
    //       &branchId=1&date=2026-10-31&purchaseId=12
    //===========================================================

    [HttpGet("mushak-check")]
    public Task<IActionResult> CheckMushak(
        [FromQuery] string? supplierCode,
        [FromQuery] string? mushakNo,
        [FromQuery] long branchId,
        [FromQuery] string? date,
        [FromQuery] long? purchaseId)
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
                    await _repository.CheckMushakAsync(
                        supplierCode ?? string.Empty,
                        mushakNo ?? string.Empty,
                        branchId,
                        day,
                        purchaseId));
            },
            "Failed to check the Mushak 6.3 No.");
    }


    //===========================================================
    // Unit Desk check (live) : bike numbers already on another
    // purchase
    //   POST unit-check { PurchaseId, Units:[{ChassisNo, ...}] }
    //===========================================================

    [HttpPost("unit-check")]
    public Task<IActionResult> CheckUnits(
        [FromBody] PurchaseUnitCheckDto? dto)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.CheckUnitsAsync(
                        dto ?? new PurchaseUnitCheckDto())),
            "Failed to check the bike numbers.");
    }


    //===========================================================
    // MB draft : the supplier's free accessories due on the bikes
    // on the page (schemes valid on the purchase date)
    //   POST accessory-preview { PurchaseDate, Lines:[{ProductId, Bikes}] }
    //===========================================================

    [HttpPost("accessory-preview")]
    public Task<IActionResult> PreviewAccessories(
        [FromBody] PurchaseAccessoryPreviewDto? dto)
    {
        return Run(
            async () =>
                Ok(
                    await _repository.PreviewAccessoriesAsync(
                        dto ?? new PurchaseAccessoryPreviewDto())),
            "Failed to work out the free accessories.");
    }


    //===========================================================
    // Open Purchase Orders of a supplier (PO Required ON)
    //   GET open-orders?supplierCode=SUP-000001&keepOrderId=12
    //===========================================================

    [HttpGet("open-orders")]
    public Task<IActionResult> GetOpenOrders(
        [FromQuery] string? supplierCode,
        [FromQuery] long? keepOrderId)
    {
        return Run(
            async () => Ok(await _repository.GetOpenOrdersAsync(PageType, supplierCode ?? string.Empty, keepOrderId)),
            "Failed to load the open purchase orders.");
    }


    //===========================================================
    // Get By Id
    //===========================================================

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

        PurchaseDto? item =
            await _repository.GetByIdAsync(id);

        return item == null || item.PageType != PageType
            ? NotFound("Purchase not found.")
            : Ok(item);
    }


    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public async Task<IActionResult> Create(
        CreatePurchaseDto dto)
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
            "Failed to create the purchase.");
    }


    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(
        Guid publicId,
        UpdatePurchaseDto dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Purchase not found.");
        }

        // The uuid in the address decides the record ; an id in
        // the body is ignored
        dto.PurchaseId =
            foundId.Value;

        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(dto.PurchaseId, "Update");

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
            "Failed to update the purchase.");
    }


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
            "Failed to delete the purchase.");
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
                    : NotFound("There are no deleted purchases available to restore."),
            "Failed to restore the purchase.");
    }


    //===========================================================
    // Workflow
    //===========================================================

    [HttpPut("{publicId:guid}/approve")]
    public async Task<IActionResult> Approve(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Purchase not found.");
        }

        long id =
            foundId.Value;

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
            "Failed to approve the purchase.");
    }


    [HttpPut("{publicId:guid}/return-to-draft")]
    public async Task<IActionResult> ReturnToDraft(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Purchase not found.");
        }

        long id =
            foundId.Value;

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
            "Failed to return the purchase to draft.");
    }


    [HttpPut("{publicId:guid}/post")]
    public async Task<IActionResult> Post(
        Guid publicId)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Purchase not found.");
        }

        long id =
            foundId.Value;

        long userId = UserId;

        IActionResult? denied =
            await DenyForOrderAsync(id, "Post");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () =>
            {
                await _repository.PostAsync(id, userId);

                return NoContent();
            },
            "Failed to post the purchase.");
    }


    [HttpPut("{publicId:guid}/cancel")]
    public async Task<IActionResult> Cancel(
        Guid publicId,
        CancelPurchaseDto dto)
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound("Purchase not found.");
        }

        long id =
            foundId.Value;

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
            "Failed to cancel the purchase.");
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
                $"Purchase{PageType}"));
    }
}
