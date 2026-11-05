//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Api.Extensions;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SalesOperations.Shared;


//===============================================================
// Sales Invoices Controller : the endpoints of every Sales
// Invoices page. Each page's controller (SP / AC / MB) only gives
// its route, page type and repository.
//
// The page type is always the controller's own (a PageType sent
// by the page is ignored); the branch is the login branch (token)
// when there is one.
//
// 400 : input or rule broken ; 403 : no permission ;
// 404 : not found
//
// Every change checks the user's activity on the invoice's page
// (Role Assignment + Special Assignment) :
//   Create : Add          Update : Update      Delete : Delete
//   Restore : Restore     Approve : Approve    Return : Return
//   Post : Post           Cancel : Cancel      Walk-in : Add
//   Any special discount on Create / Update : Give Special
//   Discount (the quote reports it as an error instead)
//===============================================================

public abstract class SalesInvoiceControllerBase : ControllerBase
{
    private const string ActivitySpecial =
        "Give Special Discount";

    private readonly ISalesInvoiceRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ILogger _logger;

    // Logged-in user (token)
    private long UserId => this.CurrentUserId();


    protected SalesInvoiceControllerBase(
        ISalesInvoiceRepository repository,
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

    // SP / AC / MB
    protected abstract string PageType { get; }

    // "/sales-operations/%/sales-invoices-sp"
    protected abstract string PageRoute { get; }


    //===========================================================
    // Permission
    //===========================================================

    private Task<bool> HasAsync
    (
        string activity
    )
    {
        return _effectiveAccess.HasActivityAsync(
            UserId,
            PageRoute,
            activity);
    }


    // null when allowed, else the 403 answer
    private async Task<IActionResult?> DenyAsync
    (
        string activity
    )
    {
        return await HasAsync(activity)
            ? null
            : StatusCode(
                StatusCodes.Status403Forbidden,
                $"You do not have the \"{activity}\" permission on this Sales Invoices page.");
    }


    // The invoice's own page decides (an id never trusts the client)
    private async Task<IActionResult?> DenyForInvoiceAsync
    (
        long id,
        string activity
    )
    {
        SalesInvoiceDto? invoice =
            await _repository.GetByIdAsync(id);

        if (invoice == null || invoice.PageType != PageType)
        {
            return NotFound("Sales invoice not found.");
        }

        return await DenyAsync(
            activity);
    }


    // A special discount (line % or invoice level) is asked for
    private static bool HasSpecial
    (
        CreateSalesInvoiceDto dto
    )
    {
        return (dto.Lines ?? new List<CreateSalesInvoiceLineDto>()).Any(x => (x.SpecialDiscountPercent ?? 0m) != 0m)
               ||
               (
                   !string.IsNullOrWhiteSpace(dto.InvoiceSpecialType)
                   &&
                   !string.Equals(dto.InvoiceSpecialType.Trim(), "None", StringComparison.OrdinalIgnoreCase)
                   &&
                   dto.InvoiceSpecialValue != 0m
               );
    }


    // The login branch wins over the one sent
    private void UseLoginBranch
    (
        CreateSalesInvoiceDto dto
    )
    {
        dto.PageType = PageType;

        long? branchId =
            this.CurrentBranchId();

        if (branchId.HasValue && branchId.Value > 0)
        {
            dto.BranchId = branchId.Value;
        }
    }


    private static DateOnly DayOf
    (
        string? date
    )
    {
        return DateOnly.TryParseExact(
                   (date ?? string.Empty).Trim(),
                   "yyyy-MM-dd",
                   CultureInfo.InvariantCulture,
                   DateTimeStyles.None,
                   out DateOnly parsed)
            ? parsed
            : DateOnly.FromDateTime(DateTime.Now);
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
    //   GET ?status=Draft
    //===========================================================

    [HttpGet]
    public Task<IActionResult> GetAll(
        [FromQuery] string? status)
    {
        return Run(
            async () => Ok(await _repository.GetAllAsync(PageType, status)),
            "Failed to load the sales invoices.");
    }


    //===========================================================
    // List page : one page + tab counts
    //   GET paged?page=1&pageSize=10&search=&sort=&dir=&tab=
    //===========================================================

    [HttpGet("paged")]
    public Task<IActionResult> GetPaged(
        [FromQuery] SalesInvoicePageRequest request)
    {
        return Run(
            async () => Ok(await _repository.GetPagedAsync(PageType, request ?? new SalesInvoicePageRequest())),
            "Failed to load the sales invoices.");
    }


    //===========================================================
    // Get Defaults : number preview, branch, warehouses, sales
    // persons, switches, the user's page activities
    //   GET defaults?date=2026-11-03&branchId=1
    //===========================================================

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults(
        [FromQuery] string? date,
        [FromQuery] long? branchId)
    {
        return Run(
            async () =>
            {
                long branch =
                    this.CurrentBranchId() ?? branchId ?? 0;

                SalesInvoiceDefaultsDto defaults =
                    await _repository.GetDefaultsAsync(
                        PageType,
                        branch,
                        DayOf(date),
                        UserId);

                defaults.CanGiveSpecialDiscount = await HasAsync(ActivitySpecial);
                defaults.CanApprove = await HasAsync("Approve");
                defaults.CanReturn = await HasAsync("Return");
                defaults.CanPost = await HasAsync("Post");
                defaults.CanCancel = await HasAsync("Cancel");
                defaults.CanPrint = await HasAsync("Print");

                return Ok(defaults);
            },
            "Failed to load the sales invoice defaults.");
    }


    //===========================================================
    // Products (code / part no / name / barcode), optionally
    // within a category / sub category
    //   GET products?warehouseId=3&search=piston&categoryId=2
    // browse=true : the full list for the product dropdown
    //===========================================================

    [HttpGet("products")]
    public Task<IActionResult> GetProducts(
        [FromQuery] long warehouseId,
        [FromQuery] string? search,
        [FromQuery] long? categoryId,
        [FromQuery] long? subCategoryId,
        [FromQuery] bool browse = false)
    {
        return Run(
            async () => Ok(await _repository.GetProductsAsync(PageType, warehouseId, search, categoryId, subCategoryId, browse)),
            "Failed to load the items.");
    }


    //===========================================================
    // Customer live search
    //   GET customer-search?q=0171 (phone 1 / 2, name or code)
    //===========================================================

    [HttpGet("customer-search")]
    public Task<IActionResult> SearchCustomers(
        [FromQuery] string? q)
    {
        return Run(
            async () => Ok(await _repository.SearchCustomersAsync(PageType, q)),
            "Failed to search the customers.");
    }


    //===========================================================
    // Customer by phone
    //   GET customer-lookup?phone=01711223344&date=2026-11-03
    //===========================================================

    [HttpGet("customer-lookup")]
    public Task<IActionResult> LookupCustomer(
        [FromQuery] string? phone,
        [FromQuery] string? date)
    {
        return Run(
            async () => Ok(await _repository.LookupCustomerAsync(PageType, phone, DayOf(date))),
            "Failed to find the customer.");
    }


    //===========================================================
    // Add Customer (walk-in)
    //   POST walk-in-customer { Name, Phone, Address }
    //===========================================================

    [HttpPost("walk-in-customer")]
    public async Task<IActionResult> CreateWalkInCustomer(
        SalesInvoiceWalkInDto dto)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyAsync("Add");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () => Ok(await _repository.CreateWalkInCustomerAsync(PageType, dto, userId)),
            "Failed to add the customer.");
    }


    //===========================================================
    // Quote : the priced invoice, nothing saved
    //   POST quote { same body as create }
    //===========================================================

    [HttpPost("quote")]
    public async Task<IActionResult> Quote(
        CreateSalesInvoiceDto dto)
    {
        long userId = UserId;

        UseLoginBranch(dto);

        bool canSpecial =
            await HasAsync(ActivitySpecial);

        return await Run(
            async () => Ok(await _repository.QuoteAsync(dto, canSpecial, userId)),
            "Failed to price the sales invoice.");
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

        SalesInvoiceDto? item =
            await _repository.GetByIdAsync(id);

        return item == null || item.PageType != PageType
            ? NotFound("Sales invoice not found.")
            : Ok(item);
    }


    //===========================================================
    // Create / Update / Delete / Restore
    //===========================================================

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateSalesInvoiceDto dto)
    {
        long userId = UserId;

        UseLoginBranch(dto);

        IActionResult? denied =
            await DenyAsync("Add");

        if (denied != null)
        {
            return denied;
        }

        if (HasSpecial(dto))
        {
            denied =
                await DenyAsync(ActivitySpecial);

            if (denied != null)
            {
                return denied;
            }
        }

        return await Run(
            async () => Ok(await _repository.CreateAsync(dto, true, userId)),
            "Failed to save the sales invoice.");
    }


    [HttpPut]
    public async Task<IActionResult> Update(
        UpdateSalesInvoiceDto dto)
    {
        long userId = UserId;

        UseLoginBranch(dto);

        IActionResult? denied =
            await DenyForInvoiceAsync(dto.SalesInvoiceId, "Update");

        if (denied != null)
        {
            return denied;
        }

        if (HasSpecial(dto))
        {
            denied =
                await DenyAsync(ActivitySpecial);

            if (denied != null)
            {
                return denied;
            }
        }

        return await Run(
            async () => Ok(await _repository.UpdateAsync(dto, true, userId)),
            "Failed to update the sales invoice.");
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
            await DenyForInvoiceAsync(id, "Delete");

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
            "Failed to delete the sales invoice.");
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
                    : NotFound("There are no deleted sales invoices available to restore."),
            "Failed to restore the sales invoice.");
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
            await DenyForInvoiceAsync(id, "Approve");

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
            "Failed to approve the sales invoice.");
    }


    [HttpPut("{id:long}/return-to-draft")]
    public async Task<IActionResult> ReturnToDraft(
        long id)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForInvoiceAsync(id, "Return");

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
            "Failed to return the sales invoice to draft.");
    }


    [HttpPut("{id:long}/post")]
    public async Task<IActionResult> Post(
        long id)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForInvoiceAsync(id, "Post");

        if (denied != null)
        {
            return denied;
        }

        return await Run(
            async () => Ok(await _repository.PostAsync(id, userId)),
            "Failed to post the sales invoice.");
    }


    [HttpPut("{id:long}/cancel")]
    public async Task<IActionResult> Cancel(
        long id,
        CancelSalesInvoiceDto dto)
    {
        long userId = UserId;

        IActionResult? denied =
            await DenyForInvoiceAsync(id, "Cancel");

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
            "Failed to cancel the sales invoice.");
    }


    //===========================================================
    // History (one page)
    //===========================================================

    [HttpGet("history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Sales Operations",
                $"SalesInvoices{PageType}"));
    }
}
